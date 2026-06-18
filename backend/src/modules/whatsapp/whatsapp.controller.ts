import { Request, Response } from "express";
import { env } from "../../config/env.js";
import { logger } from "../../lib/logger.js";
import { webhookRequestsTotal, webhookProcessingDuration } from "../../lib/metrics.js";
/**
 * Verifies the Webhook challenge sent by Meta.
 * Required when setting up the webhook in the Meta Developer Portal.
 */
export const verifyWebhook = (req: Request, res: Response) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  // Check if a request is from Meta
  if (mode && token) {
    if (mode === "subscribe" && token === env.META_WA_VERIFY_TOKEN) {
      logger.info({ challenge }, "Webhook verified successfully");
      return res.status(200).send(challenge);
    } else {
      logger.error({ mode, token }, "Webhook verification failed due to token mismatch");
      return res.sendStatus(403);
    }
  }

  return res.sendStatus(400);
};

import { enqueueWebhookEvent } from "./whatsapp.queue.js";
import { prisma } from "../../prisma/index.js";
import { OutboundMessageStatus } from "@prisma/client";

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  PENDING: ["SENT", "DELIVERED", "READ", "FAILED"],
  SENT: ["DELIVERED", "READ", "FAILED"],
  DELIVERED: ["READ"], // Cannot go to FAILED
  READ: [], // Terminal success state
  FAILED: ["PENDING"], // Can be retried by the worker locally
};

/**
 * Handles incoming messages/events from the Meta WhatsApp Cloud API.
 */
export const processWebhook = async (req: Request, res: Response) => {
  const endTimer = webhookProcessingDuration.startTimer();
  try {
    const body = req.body;

    if (body.object !== "whatsapp_business_account") {
      webhookRequestsTotal.inc({ status: "invalid_object" });
      endTimer();
      return res.sendStatus(400);
    }

    webhookRequestsTotal.inc({ status: "received" });

    // Process each message in the payload
    for (const entry of body.entry) {
      for (const change of entry.changes) {
        const value = change.value;
        if (value && value.messages && value.messages[0]) {
          const msg = value.messages[0];
          const contact = value.contacts && value.contacts[0] ? value.contacts[0] : null;

          const sender = msg.from;
          const messageId = msg.id;

          if (!sender || !messageId) continue;

          // A. Idempotency Check
          // Layer 1 duplicate protection via PostgreSQL UNIQUE constraint checks
          const existingEvent = await prisma.webhookEvent.findUnique({
            where: { messageId },
          });

          if (existingEvent) {
            logger.info({ messageId, sender }, "Duplicate messageId ignored (already exists in DB)");
            // Return 200 implicitly by continuing the loop without action
            continue;
          }

          // B. New Message
          // Insert WebhookEvent(RECEIVED)
          try {
            await prisma.webhookEvent.create({
              data: {
                messageId,
                sender,
                payload: { msg, contact }, // Stored as Json
                status: "RECEIVED",
                metaTimestamp: msg.timestamp ? parseInt(msg.timestamp, 10) : null
              },
            });
          } catch (err: any) {
            if (err.code === "P2002") {
              // P2002: Unique constraint failed. This is a concurrent duplicate delivery.
              logger.info({ messageId, sender }, "Concurrent duplicate messageId ignored during insert");
              continue; // Skip enqueue, effectively returning 200
            }
            // Real database failure, re-throw to trigger 500
            throw err;
          }

          // Attempt enqueue
          try {
            await enqueueWebhookEvent(messageId, { msg, contact });

            // If enqueue succeeds
            await prisma.webhookEvent.update({
              where: { messageId },
              data: {
                status: "QUEUED",
                queuedAt: new Date(),
              },
            });
            logger.info({ messageId, sender }, "Enqueued new trigger job successfully");
          } catch (queueErr: any) {
            // If enqueue fails: keep status = RECEIVED, queuedAt = null
            logger.error({ messageId, sender, err: queueErr.message }, "CRITICAL: BullMQ Enqueue Failed");
            // Do not throw so that we still return HTTP 200
          }
        } else if (value && value.statuses && value.statuses[0]) {
          // Process Outbound Message Status Updates
          for (const statusObj of value.statuses) {
            const wamid = statusObj.id;
            const metaStatus = statusObj.status; // 'sent', 'delivered', 'read', 'failed'
            const timestamp = statusObj.timestamp ? parseInt(statusObj.timestamp, 10) * 1000 : Date.now();
            
            if (!wamid || !metaStatus) continue;
            
            // Ignore 'warning' status as per Phase 1 requirements
            if (metaStatus === 'warning') continue;

            const dedupeId = `${wamid}_${metaStatus}`;
            try {
              // Layer 1 duplicate protection
              await prisma.metaWebhookEvent.create({
                data: {
                  eventId: dedupeId,
                  payload: statusObj
                }
              });
            } catch (err: any) {
              if (err.code === "P2002") {
                logger.info({ wamid, metaStatus }, "Duplicate status webhook ignored");
                continue;
              }
              throw err;
            }

            const mappedStatus = metaStatus.toUpperCase() as OutboundMessageStatus;
            
            // Fetch current message
            const outboundMsg = await prisma.outboundMessage.findUnique({
              where: { metaMessageId: wamid }
            });

            if (!outboundMsg) {
              logger.warn({ wamid, metaStatus }, "Status received for unknown outbound message");
              continue;
            }

            const currentStatus = outboundMsg.status;
            const allowedNextStates = ALLOWED_TRANSITIONS[currentStatus] || [];

            // Enforce Monotonicity
            if (!allowedNextStates.includes(mappedStatus)) {
              logger.info({ wamid, metaStatus, currentStatus }, "Ignoring out-of-order or invalid status transition");
              continue;
            }

            const updateData: any = { status: mappedStatus };
            if (mappedStatus === "DELIVERED") updateData.deliveredAt = new Date(timestamp);
            if (mappedStatus === "READ") updateData.readAt = new Date(timestamp);
            if (mappedStatus === "FAILED") {
               updateData.errorMessage = statusObj.errors ? JSON.stringify(statusObj.errors) : "Unknown Meta Error";
               // We don't automatically trigger retryCount here as the worker handles its own send failures,
               // but if needed we can increment it here. The requirement says:
               // "Increment retryCount on retries" (This typically applies to the worker loop).
            }

            await prisma.outboundMessage.update({
              where: { metaMessageId: wamid },
              data: updateData
            });

            logger.info({ wamid, status: mappedStatus }, "Outbound message status updated");
          }
        }
      }
    }

    // Acknowledge the webhook request immediately to prevent Meta from retrying
    endTimer();
    return res.sendStatus(200);
  } catch (error: any) {
    logger.error({ err: error.message || error }, "Error in processWebhook");
    webhookRequestsTotal.inc({ status: "error" });
    endTimer();
    // If DB fails (Prisma error), we return 500 so Meta will retry
    return res.sendStatus(500);
  }
};
