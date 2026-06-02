import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { env } from "./config/env.js";
import { apiRouter } from "./routes/index.js";
import { requestLogger } from "./common/middleware/request-logger.middleware.js";
import { notFoundHandler } from "./common/middleware/not-found.middleware.js";
import { errorHandler } from "./common/middleware/error.middleware.js";

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
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(requestLogger);

// Support both /api (frontend default) and /api/v1 for versioning
app.use("/api", apiRouter);
app.use("/api/v1", apiRouter);
app.use(notFoundHandler);
app.use(errorHandler);
