import { Worker, Job } from "bullmq";
import { redisConnection } from "./redis.js";
import { WHATSAPP_QUEUE_NAME } from "./queue.constants.js";
import { prisma } from "../../prisma/index.js";
import { env } from "../../config/env.js";
import { runOpenClawAgent } from "./openclaw.agent.js";
import { v4 as uuidv4 } from "uuid";
import { DistributedLockService } from "./distributed-lock.service.js";
import { sendWhatsAppMessage } from "./whatsapp.service.js";
import { broadcastConversationUpdate } from "../../socket.js";
import { logger } from "../../lib/logger.js";
import { lockContentionTotal } from "../../lib/metrics.js";
import { normalizePhone } from "../../common/lib/phone.utils.js";

/**
 * Executes the core WhatsApp processing logic for a single message.
 * Extracts the message handling from the old bulk loop to support individual retries.
 */
async function processSingleMessage(msg: any, contact: any, webhookEventId: string) {
  const sender = msg.from;
  const messageId = msg.id;

  if (!sender || !messageId) throw new Error("Invalid message payload: missing sender or id");

  let text = "";
  if (msg.type === "text") {
    text = msg.text.body;
  } else if (msg.type === "button") {
    text = msg.button.text;
  } else if (msg.type === "interactive") {
    text = msg.interactive.button_reply?.title || msg.interactive.list_reply?.title || "";
  }
  text = text.trim();

  if (!text) return; // Ignore non-text/interactive messages for now

  if (text.length > 1000) {
    text = text.substring(0, 1000) + "... [truncated]";
  }

  const phone = sender;
  logger.info({ phone, messageId }, "Processing individual message text");
  const pushName = contact?.profile?.name || undefined;

  // Execute OpenClaw agent
  const reply = await runOpenClawAgent({
    phone,
    pushName,
    userMessage: text,
  });

  const normalizedPhone = normalizePhone(phone);
  const customer = await prisma.customer.findFirst({
    where: { phone: normalizedPhone },
    include: { conversations: true },
  });

  let conversationId: string | undefined = undefined;
  if (customer && customer.conversations.length > 0) {
    conversationId = customer.conversations[0].id;
    broadcastConversationUpdate(conversationId, customer.id);
  }

  // Find existing outbound message for this webhook event (in case of retries)
  let outboundMessage = await prisma.outboundMessage.findFirst({
    where: { webhookEventId }
  });

  if (outboundMessage) {
    outboundMessage = await prisma.outboundMessage.update({
      where: { id: outboundMessage.id },
      data: {
        status: "PENDING",
        retryCount: { increment: 1 },
        lastRetryAt: new Date()
      }
    });
    logger.info({ id: outboundMessage.id, retryCount: outboundMessage.retryCount }, "Retrying existing outbound message");
  } else {
    outboundMessage = await prisma.outboundMessage.create({
      data: {
        recipient: phone,
        content: reply,
        status: "PENDING",
        conversationId: conversationId,
        webhookEventId: webhookEventId,
      }
    });
  }

  const sendResult = await sendWhatsAppMessage(phone, reply);
  
  if (sendResult.success && sendResult.wamid) {
    await prisma.outboundMessage.update({
      where: { id: outboundMessage.id },
      data: {
        status: "SENT",
        metaMessageId: sendResult.wamid,
        sentAt: new Date(),
      }
    });
    logger.info({ phone, messageId, wamid: sendResult.wamid }, "Sent reply successfully");
  } else {
    await prisma.outboundMessage.update({
      where: { id: outboundMessage.id },
      data: {
        status: "FAILED",
        errorMessage: sendResult.error,
      }
    });
    logger.error({ phone, messageId, error: sendResult.error }, "Failed to send reply");
  }
}

/**
 * BullMQ Worker instance.
 */
export const whatsappWorker = new Worker(
  WHATSAPP_QUEUE_NAME,
  async (job: Job) => {
    logger.info({ jobId: job.id }, "Worker trigger job started");
    
    if (!job.data || !job.data.msg || !job.data.msg.from) {
      logger.warn({ jobId: job.id }, "Job missing msg.from data. Skipping.");
      return;
    }

    const phone = job.data.msg.from;
    const workerId = uuidv4();

    // 1. Try to acquire the lock for this conversation
    const acquired = await DistributedLockService.acquireLock(phone, workerId, 120000);
    
    if (!acquired) {
      // Redundant trigger: another worker is currently draining this conversation's queue
      lockContentionTotal.inc();
      logger.info({ phone, workerId, jobId: job.id }, "Lock held by active drainer. Exiting cleanly.");
      return;
    }

    try {
      logger.info({ phone, workerId, jobId: job.id }, "Lock acquired. Starting drain loop.");
      let processedCount = 0;

      while (true) {
        // Heartbeat: refresh lock TTL to 90 seconds before each iteration
        // Wait, max execution time for Ollama could be up to 60s, so 120s TTL is safer.
        const refreshed = await DistributedLockService.refreshLock(phone, workerId, 120000);
        
        if (!refreshed) {
          logger.error({ phone, workerId, jobId: job.id }, "CRITICAL: Lost lock ownership. Terminating drain loop to prevent duplicate execution.");
          break;
        }

        // Fetch the oldest pending message for this conversation
        const event = await prisma.webhookEvent.findFirst({
          where: { sender: phone, status: { in: ["RECEIVED", "QUEUED"] } },
          orderBy: [
            { metaTimestamp: "asc" },
            { sequenceId: "asc" }
          ],
        });

        if (!event) {
          logger.info({ phone, workerId, processedCount }, "Queue completely drained");
          break; // Queue is completely drained
        }

        logger.info({ phone, messageId: event.messageId, sequenceId: event.sequenceId }, "Draining message");

        try {
          const payload = event.payload as any;
          if (payload && payload.msg) {
            await processSingleMessage(payload.msg, payload.contact, event.id);
          } else {
            logger.warn({ messageId: event.messageId }, "Missing payload. Marking PROCESSED to prevent loop.");
          }

          // Mark PROCESSED
          await prisma.webhookEvent.update({
            where: { id: event.id },
            data: {
              status: "PROCESSED",
              processedAt: new Date(),
            },
          });
          processedCount++;

        } catch (error: any) {
          logger.error({ messageId: event.messageId, err: error.message }, "Error processing message");
          
          // Increment failure count
          const updatedEvent = await prisma.webhookEvent.update({
            where: { id: event.id },
            data: {
              failureCount: { increment: 1 },
              lastError: error.message || String(error),
            },
          });

          // Check if we hit DLQ limit locally (e.g., 3 failures)
          if (updatedEvent.failureCount >= 3) {
             logger.error({ messageId: event.messageId }, "Message reached max failures. Marking FAILED.");
             await prisma.webhookEvent.update({
               where: { id: event.id },
               data: { status: "FAILED" }
             });
          } else {
             // Let the error bubble up so BullMQ can stall/retry the trigger job, OR
             // send fallback message on 2nd failure
             if (updatedEvent.failureCount === 2 && !updatedEvent.fallbackSent) {
                try {
                  await prisma.webhookEvent.update({
                    where: { id: event.id },
                    data: { fallbackSent: true },
                  });
                  logger.warn({ phone }, "Sending fallback warning message");
                  
                  const fallbackContent = "⚠️ *High Volume Alert*\n\nWe are currently experiencing heavy traffic and responses may be delayed. I will get back to you shortly!";
                  const outboundMsg = await prisma.outboundMessage.create({
                    data: {
                      recipient: phone,
                      content: fallbackContent,
                      status: "PENDING",
                      webhookEventId: event.id
                    }
                  });
                  
                  const fallbackResult = await sendWhatsAppMessage(phone, fallbackContent);
                  
                  if (fallbackResult.success && fallbackResult.wamid) {
                    await prisma.outboundMessage.update({
                      where: { id: outboundMsg.id },
                      data: { status: "SENT", metaMessageId: fallbackResult.wamid, sentAt: new Date() }
                    });
                  } else {
                    await prisma.outboundMessage.update({
                      where: { id: outboundMsg.id },
                      data: { status: "FAILED", errorMessage: fallbackResult.error }
                    });
                  }
                } catch (fallbackErr) {
                  logger.error({ err: fallbackErr }, "Failed to send fallback message");
                }
             }
             // Throw to fail the job and release lock, letting BullMQ retry the trigger later
             throw error;
          }
        }
      }
    } finally {
      // Safe Release
      await DistributedLockService.releaseLock(phone, workerId);
      logger.info({ phone, workerId }, "Lock release triggered");
    }
  },
  {
    connection: redisConnection as any,
    concurrency: env.WORKER_CONCURRENCY,
    autorun: false, // We manually start it in worker.ts
  }
);

// On final failure (DLQ)
whatsappWorker.on("failed", async (job, err) => {
  if (!job || !job.id) return;

  // BullMQ emits 'failed' when all retries are exhausted (job has failed permanently)
  // However, it also emits 'failed' on EVERY failure attempt.
  // We can distinguish terminal failure by checking attemptsMade vs max attempts.
  const maxAttempts = job.opts.attempts || 1;
  if (job.attemptsMade >= maxAttempts) {
    logger.error({ jobId: job.id }, "Worker DLQ: Job reached max retries. Marking as FAILED.");
    try {
      await prisma.webhookEvent.update({
        where: { messageId: job.id },
        data: {
          status: "FAILED",
        },
      });
    } catch (dbErr) {
      logger.error({ jobId: job.id, err: dbErr }, "Failed to update DB for terminal job");
    }
  }
});

whatsappWorker.on("error", (err) => {
  logger.error({ err }, "Internal BullMQ Worker Error");
});
