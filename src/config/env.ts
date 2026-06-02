import { z } from "zod";

const envSchema = z.object({
  VITE_API_BASE_URL: z.string().url(),
  VITE_API_TIMEOUT: z.coerce.number().positive(),
  VITE_AUTH_TOKEN_KEY: z.string().min(1),
  VITE_AUTH_REFRESH_TOKEN_KEY: z.string().min(1),
  VITE_MOCK_AUTH: z.boolean(),
  VITE_ENABLE_QUERY_DEVTOOLS: z.boolean(),
  VITE_APP_NAME: z.string().min(1),
});

function parseEnv() {
  const raw = {
    VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000/api",
    VITE_API_TIMEOUT: import.meta.env.VITE_API_TIMEOUT ?? "30000",
    VITE_AUTH_TOKEN_KEY: import.meta.env.VITE_AUTH_TOKEN_KEY ?? "yandox_access_token",
    VITE_AUTH_REFRESH_TOKEN_KEY:
      import.meta.env.VITE_AUTH_REFRESH_TOKEN_KEY ?? "yandox_refresh_token",
    VITE_MOCK_AUTH:
      (import.meta.env.VITE_MOCK_AUTH ?? (import.meta.env.DEV ? "true" : "false")) === "true",
    VITE_ENABLE_QUERY_DEVTOOLS:
      (import.meta.env.VITE_ENABLE_QUERY_DEVTOOLS ?? (import.meta.env.DEV ? "true" : "false")) ===
      "true",
    VITE_APP_NAME: import.meta.env.VITE_APP_NAME ?? "Ishan Technologies",
  };

  const result = envSchema.safeParse(raw);
  if (!result.success) {
    console.error("Invalid environment configuration:", result.error.flatten().fieldErrors);
    throw new Error("Invalid environment configuration");
  }
  return result.data;
}

export const env = parseEnv();
