import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { env } from "./config/env.js";
import { apiRouter } from "./routes/index.js";
import { requestLogger } from "./common/middleware/request-logger.middleware.js";
import { notFoundHandler } from "./common/middleware/not-found.middleware.js";
import { errorHandler } from "./common/middleware/error.middleware.js";

// SRE Integrations
import basicAuth from "express-basic-auth";
import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { ExpressAdapter } from "@bull-board/express";
import { Queue } from "bullmq";
import { redisConnection } from "./modules/whatsapp/redis.js";
import { WHATSAPP_QUEUE_NAME } from "./modules/whatsapp/queue.constants.js";
import { metricsRegistry } from "./lib/metrics.js";

export const app = express();

app.use(helmet());
// In development, allow requests from any origin to simplify local testing.
// In production, restrict to configured CORS_ORIGIN for security.
app.use(
	cors({
		origin: env.NODE_ENV === "production" ? env.CORS_ORIGIN : true,
		credentials: true,
	}),
);
app.use(express.json({
	verify: (req: any, res, buf) => {
		req.rawBody = buf;
	}
}));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(requestLogger);

// ==========================================
// SRE OBSERVABILITY ENDPOINTS
// ==========================================

// 1. Prometheus Metrics (Internal only, no auth required for simple scraping by prometheus, though could be protected)
app.get("/metrics", async (req, res) => {
  res.set("Content-Type", metricsRegistry.contentType);
  res.end(await metricsRegistry.metrics());
});

// 2. Bull Board Queue Dashboard (Protected by Basic Auth)
const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath("/admin/queues");

const whatsappQueue = new Queue(WHATSAPP_QUEUE_NAME, { connection: redisConnection as any });

createBullBoard({
  queues: [new BullMQAdapter(whatsappQueue)],
  serverAdapter: serverAdapter,
});

app.use(
  "/admin/queues",
  basicAuth({
    users: { admin: (((env as any).JWT_SECRET) && ((env as any).JWT_SECRET).substring(0, 8)) || "admin" }, // Use env secret as password for simplicity in this setup
    challenge: true,
  }),
  serverAdapter.getRouter()
);

// ==========================================
// APPLICATION ENDPOINTS
// ==========================================

// Support both /api (frontend default) and /api/v1 for versioning
app.use("/api", apiRouter);
app.use("/api/v1", apiRouter);
app.use(notFoundHandler);
app.use(errorHandler);
