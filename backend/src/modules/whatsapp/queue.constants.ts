import { JobsOptions } from "bullmq";

export const WHATSAPP_QUEUE_NAME = "whatsapp-webhook-events";

/**
 * BullMQ Job Options configured for resilient webhook processing.
 */
export const QUEUE_JOB_OPTIONS: JobsOptions = {
  attempts: 5,
  backoff: {
    type: "exponential",
    delay: 5000,
  },
  // Automatically remove jobs that succeed to keep Redis memory footprint low
  removeOnComplete: true,
  // Keep failed jobs in Redis so they can act as our Dead Letter Queue (DLQ)
  // Operators can inspect or retry these jobs using BullMQ UI or CLI tools
  removeOnFail: false, 
};
