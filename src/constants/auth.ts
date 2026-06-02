import { env } from "@/config";

export const AUTH_STORAGE_KEYS = {
  accessToken: env.VITE_AUTH_TOKEN_KEY,
  refreshToken: env.VITE_AUTH_REFRESH_TOKEN_KEY,
} as const;

export const AUTH_ROUTES = {
  login: "/login",
  logout: "/logout",
  unauthorized: "/unauthorized",
} as const;

/** Mock session used when VITE_MOCK_AUTH=true (no backend). */
export const MOCK_SESSION = {
  accessToken: "mock-access-token",
  refreshToken: "mock-refresh-token",
  user: {
    id: "user-1",
    email: "hawkins@yandox.com",
    name: "Hawkins Maru",
    role: "manager" as const,
    avatarInitials: "HM",
    title: "Company Manager",
  },
} as const;
