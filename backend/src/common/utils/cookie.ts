import type { Response } from "express";
import { env } from "../../config/env.js";

function parseDuration(value: string): number {
  const match = value.match(/^(\d+)([smhd])$/);
  if (!match) return 7 * 24 * 60 * 60 * 1000;

  const amount = Number(match[1]);
  const unit = match[2];

  switch (unit) {
    case "s":
      return amount * 1000;
    case "m":
      return amount * 60 * 1000;
    case "h":
      return amount * 60 * 60 * 1000;
    case "d":
      return amount * 24 * 60 * 60 * 1000;
    default:
      return 7 * 24 * 60 * 60 * 1000;
  }
}

export function setRefreshTokenCookie(res: Response, token: string): void {
  // For local development (COOKIE_SECURE=false) use `lax` so cookies can be used in XHR during development.
  // For production with secure cookies, use `none` and set secure flag to true per browser requirements.
  const sameSite: "lax" | "none" = env.COOKIE_SECURE ? "none" : "lax";

  res.cookie(env.REFRESH_TOKEN_COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite,
    path: "/",
    maxAge: parseDuration(env.JWT_REFRESH_TOKEN_EXPIRES_IN),
  });
}

export function clearRefreshTokenCookie(res: Response): void {
  const sameSite: "lax" | "none" = env.COOKIE_SECURE ? "none" : "lax";
  res.clearCookie(env.REFRESH_TOKEN_COOKIE_NAME, {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite,
    path: "/",
  });
}
