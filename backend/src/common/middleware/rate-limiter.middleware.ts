import type { Request, Response, NextFunction } from "express";
import { createErrorResponse } from "../lib/api-response.js";

const ipRequestMap = new Map<string, { count: number; resetTime: number }>();
const REQUEST_LIMIT = 60; // Max 60 requests
const WINDOW_MS = 60 * 1000; // 1 minute window

// Periodic cleanup of expired records to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of ipRequestMap.entries()) {
    if (now > record.resetTime) {
      ipRequestMap.delete(ip);
    }
  }
}, 5 * 60 * 1000).unref();

/**
 * Basic in-memory sliding window rate limiter.
 */
export function rateLimiter(req: Request, res: Response, next: NextFunction) {
  const ip = req.ip || req.socket.remoteAddress || "unknown-ip";
  const now = Date.now();

  const record = ipRequestMap.get(ip);

  if (!record || now > record.resetTime) {
    ipRequestMap.set(ip, {
      count: 1,
      resetTime: now + WINDOW_MS,
    });
    return next();
  }

  record.count += 1;

  if (record.count > REQUEST_LIMIT) {
    return res
      .status(429)
      .json(createErrorResponse("Too many requests from this IP. Please try again after a minute.", 429));
  }

  next();
}
