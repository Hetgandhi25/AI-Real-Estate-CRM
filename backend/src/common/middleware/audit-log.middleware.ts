import type { Request, Response, NextFunction } from "express";
import { prisma } from "../../prisma/index.js";

/**
 * Express middleware to log specific route actions.
 */
export function logAction(action: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.auth?.id || null;
    const ip = req.ip || req.socket.remoteAddress || null;
    const details = `Method: ${req.method}, Path: ${req.originalUrl}, Query: ${JSON.stringify(
      req.query
    )}, Body: ${JSON.stringify(req.body)}`;

    try {
      prisma.auditLog.create({
        data: {
          userId,
          action,
          details,
          ipAddress: ip,
        },
      }).catch((e) => {
        console.error("[AuditLog] Failed to write audit log inside middleware", e);
      });
    } catch (e) {
      console.error("[AuditLog] Failed to write audit log inside middleware", e);
    }

    next();
  };
}

/**
 * Direct function to log custom events.
 */
export async function createAuditLog(
  userId: string | null,
  action: string,
  details: string,
  ip: string | null = null
) {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        details,
        ipAddress: ip,
      },
    });
  } catch (e) {
    console.error("[AuditLog] Failed to write custom audit log", e);
  }
}
