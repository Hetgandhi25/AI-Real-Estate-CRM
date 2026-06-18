import pino from "pino";
import { env } from "../config/env.js";

// Determine if we are in production
const isProduction = env.NODE_ENV === "production";

// Create a structured JSON logger
export const logger = pino({
  level: isProduction ? "info" : "debug",
  base: {
    service: "yandox-crm",
  },
  // In development, pretty-print logs. In production, keep them as raw JSON for ELK/Datadog.
  transport: isProduction
    ? undefined
    : {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "SYS:standard",
        },
      },
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "payload.messages[*].text",
      "userMessage",
      "contact.profile.name",
      "token",
      "password"
    ],
    remove: true,
  },
});
