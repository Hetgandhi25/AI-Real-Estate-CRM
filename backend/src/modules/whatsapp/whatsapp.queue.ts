import { Queue } from "bullmq";
import { redisConnection } from "./redis.js";
import { WHATSAPP_QUEUE_NAME, QUEUE_JOB_OPTIONS } from "./queue.constants.js";

/**
 * BullMQ Queue instance for processing inbound WhatsApp webhooks.
 * This decoupled design ensures the Express API remains incredibly fast,
 * leaving heavy lifting (Ollama generation, PostgreSQL writes) to background workers.
 */
export const whatsappQueue = new Queue(WHATSAPP_QUEUE_NAME, {
  connection: redisConnection as any,
  defaultJobOptions: QUEUE_JOB_OPTIONS,
});

/**
 * Enqueue a new WhatsApp webhook event payload.
 * 
 * @param messageId - The unique Meta Message ID. Used as BullMQ jobId for strict idempotency.
 * @param payload - The complete parsed JSON payload from Meta.
 */
export async function enqueueWebhookEvent(messageId: string, payload: any): Promise<void> {
  if (redisConnection.status !== "ready") {
    throw new Error("Redis is unreachable. Fast-failing enqueue operation.");
  }

  // If Redis is unreachable, this will throw an error after retries are exhausted.
  // The API controller must catch this and handle PostgreSQL fallback persistence.
  await whatsappQueue.add("process-webhook", payload, {
    jobId: messageId,
  });
}
