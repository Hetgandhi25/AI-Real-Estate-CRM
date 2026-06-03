import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().positive().default(4000),
  CORS_ORIGIN: z.string().url().default("http://localhost:5173"),
  DATABASE_PROVIDER: z.enum(["postgresql", "sqlite"]).default("sqlite"),
  DATABASE_URL: z.string().min(1),
  JWT_ACCESS_TOKEN_SECRET: z.string().min(32),
  JWT_REFRESH_TOKEN_SECRET: z.string().min(32),
  JWT_ACCESS_TOKEN_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_TOKEN_EXPIRES_IN: z.string().default("7d"),
  COOKIE_SECURE: z.preprocess((value) => value === "true" || value === true, z.boolean()).default(false),
  REFRESH_TOKEN_COOKIE_NAME: z.string().default("refresh_token"),
  OLLAMA_BASE_URL: z.string().url().default("http://192.168.100.16:11434"),
  OLLAMA_MODEL: z.string().default("qwen3:latest"),
  WHATSAPP_SESSION_DIR: z.string().default("./sessions"),
});

const result = envSchema.safeParse(process.env);
if (!result.success) {
  console.error("Backend environment validation failed", result.error.format());
  throw new Error("Invalid backend environment configuration");
}

export const env = result.data;
