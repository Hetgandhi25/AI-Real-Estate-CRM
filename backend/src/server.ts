import dotenv from "dotenv";
import { createServer } from "http";
import { app } from "./app.js";
import { env } from "./config/env.js";
import { initSocketIO } from "./socket.js";
// WhatsApp Webhook handles initialization

dotenv.config();

const port = env.PORT;
const server = createServer(app);

// Initialize Socket.IO
initSocketIO(server);

// WhatsApp Webhooks are now handled by Express routes
// No need to start a long-running socket connection anymore.

import { prisma } from "./prisma/index.js";
import { redisConnection } from "./modules/whatsapp/redis.js";

async function bootstrap() {
  console.log("🚀 Starting Yandox API Server...");
  
  try {
    console.log("⏳ [Server] Verifying PostgreSQL connection...");
    await prisma.$queryRaw`SELECT 1`;
    console.log("✅ [Server] PostgreSQL connection verified.");

    console.log("⏳ [Server] Verifying Redis connection...");
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
    console.log("✅ [Server] Redis connection verified.");

    server.listen(port, "0.0.0.0", () => {
      console.log(`✅ [Server] Backend server running on http://localhost:${port}`);
    });
  } catch (err) {
    console.error("❌ [Server] Fatal startup error: Dependencies unreachable.", err);
    process.exit(1);
  }
}

bootstrap();
