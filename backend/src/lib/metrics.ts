import client from "prom-client";

// Global Registry
export const metricsRegistry = new client.Registry();

// Default Node.js metrics (event loop lag, memory usage, GC stats)
client.collectDefaultMetrics({ register: metricsRegistry });

// =======================
// CUSTOM METRICS
// =======================

// Webhooks
export const webhookRequestsTotal = new client.Counter({
  name: "webhook_requests_total",
  help: "Total number of webhook requests received from Meta",
  labelNames: ["status"],
  registers: [metricsRegistry],
});

export const webhookProcessingDuration = new client.Histogram({
  name: "webhook_processing_duration_seconds",
  help: "Duration to process incoming webhook payload (before queuing)",
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2],
  registers: [metricsRegistry],
});

// BullMQ Queue Status
export const bullmqJobsActive = new client.Gauge({
  name: "bullmq_jobs_active",
  help: "Number of active jobs processing in BullMQ",
  registers: [metricsRegistry],
});

export const bullmqJobsWaiting = new client.Gauge({
  name: "bullmq_jobs_waiting",
  help: "Number of waiting jobs in BullMQ",
  registers: [metricsRegistry],
});

export const bullmqJobsFailed = new client.Gauge({
  name: "bullmq_jobs_failed",
  help: "Number of failed jobs in BullMQ",
  registers: [metricsRegistry],
});

// Distributed Locks
export const lockAcquisitionTotal = new client.Counter({
  name: "lock_acquisition_total",
  help: "Total number of successful distributed lock acquisitions",
  registers: [metricsRegistry],
});

export const lockContentionTotal = new client.Counter({
  name: "lock_contention_total",
  help: "Total number of bounced redundant triggers (lock contention)",
  registers: [metricsRegistry],
});

// AI Generation
export const ollamaGenerationDuration = new client.Histogram({
  name: "ollama_generation_duration_seconds",
  help: "Time spent waiting for Ollama LLM to generate response",
  buckets: [1, 5, 10, 20, 30, 45, 60],
  registers: [metricsRegistry],
});

// Circuit Breaker
export const circuitBreakerState = new client.Gauge({
  name: "circuit_breaker_state",
  help: "Current state of the Ollama Circuit Breaker (0=Closed, 1=Open)",
  registers: [metricsRegistry],
});
