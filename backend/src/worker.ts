import { env } from "./config/env.js";
import { redisConnection } from "./modules/whatsapp/redis.js";
import { whatsappWorker } from "./modules/whatsapp/whatsapp.worker.js";

async function bootstrap() {
  console.log("🚀 Starting Yandox Worker Process...");
  
  // Validate environment occurs automatically via env.js import
  
  try {
    console.log("⏳ [Worker] Verifying PostgreSQL connection...");
    const { prisma } = await import("./prisma/index.js");
    await prisma.$queryRaw`SELECT 1`;
    console.log("✅ [Worker] PostgreSQL connection verified.");

    console.log("⏳ [Worker] Verifying Redis connection...");
    if (redisConnection.status !== "ready") {
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error("Redis connection timeout")), 5000);
        redisConnection.once("ready", () => {
          clearTimeout(timeout);
          resolve();
        });
        redisConnection.once("error", (err) => {
          clearTimeout(timeout);
          reject(err);
        });
      });
    }
    await redisConnection.ping();
    console.log("✅ [Worker] Redis connection verified.");
  } catch (err) {
    console.error("❌ [Worker] Fatal startup error: Dependencies unreachable.", err);
    process.exit(1);
  }

  console.log(`[Worker] Concurrency set to: ${env.WORKER_CONCURRENCY}`);

  // Register and start the BullMQ worker
  whatsappWorker.run();
  console.log("✅ [Worker] BullMQ Worker registered and listening for jobs.");

  // Handle graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`\n🛑 [Worker] Received ${signal}. Shutting down gracefully...`);
    try {
      // Stop accepting new jobs and wait for active jobs to finish
      await whatsappWorker.close();
      console.log("✅ [Worker] BullMQ Worker closed.");
      
      // Close Redis connection
      redisConnection.quit();
      console.log("✅ [Worker] Redis connection closed.");
      
      process.exit(0);
    } catch (err) {
      console.error("❌ [Worker] Error during shutdown:", err);
      process.exit(1);
    }
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

bootstrap().catch((err) => {
  console.error("❌ [Worker] Fatal startup error:", err);
  process.exit(1);
});
