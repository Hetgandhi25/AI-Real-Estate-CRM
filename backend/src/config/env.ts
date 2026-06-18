import "dotenv/config";
import { z } from "zod";

const noPlaceholder = (val: string | undefined) => {
  if (!val) return true;
  const lower = val.toLowerCase();
  return !lower.includes("placeholder") && !lower.includes("replace_me") && !lower.includes("changeme");
};

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().positive().default(4000),
  CORS_ORIGIN: z.string().url().default("http://localhost:5173"),
  DATABASE_PROVIDER: z.enum(["postgresql", "sqlite"]).default("sqlite"),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().url().default("redis://localhost:6379"),
  WORKER_CONCURRENCY: z.coerce.number().positive().default(5),
  JWT_ACCESS_TOKEN_SECRET: z.string().min(32),
  JWT_REFRESH_TOKEN_SECRET: z.string().min(32),
  JWT_ACCESS_TOKEN_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_TOKEN_EXPIRES_IN: z.string().default("7d"),
  COOKIE_SECURE: z.preprocess((value) => value === "true" || value === true, z.boolean()).default(false),
  REFRESH_TOKEN_COOKIE_NAME: z.string().default("refresh_token"),
  OLLAMA_BASE_URL: z.string().url().default("http://192.168.100.16:11434"),
  OLLAMA_MODEL: z.string().default("qwen3:latest"),
  META_WA_ACCESS_TOKEN: z.string().min(1).refine(noPlaceholder, "Placeholders not allowed"),
  META_WA_PHONE_NUMBER_ID: z.string().min(1).refine(noPlaceholder, "Placeholders not allowed"),
  META_WA_VERIFY_TOKEN: z.string().min(1).refine(noPlaceholder, "Placeholders not allowed"),
  META_APP_SECRET: z.string().refine(noPlaceholder, "Placeholders not allowed").optional(),
}).superRefine((data, ctx) => {
  if (data.NODE_ENV === "production" && !data.META_APP_SECRET) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "META_APP_SECRET is required in production",
      path: ["META_APP_SECRET"],
    });
  }
});

const result = envSchema.safeParse(process.env);
if (!result.success) {
  console.error("❌ [Config] Backend environment validation failed:");
  result.error.errors.forEach(e => {
    console.error(`   - ${e.path.join(".")}: ${e.message}`);
  });
  process.exit(1);
}

export const env = result.data;
