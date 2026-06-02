import type { Request, Response, NextFunction } from "express";
import { createErrorResponse } from "../lib/api-response.js";
import { ApiError } from "../lib/api-error.js";
import { loadUserById } from "../../modules/auth/auth.service.js";
import { verifyAccessToken } from "../utils/jwt.js";

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json(createErrorResponse("Authorization token missing", 401));
  }

  const token = header.replace("Bearer ", "");

  try {
    const payload = verifyAccessToken(token);
    const user = await loadUserById(payload.sub);
    if (!user) {
      throw new ApiError(401, "User not found");
    }

    req.auth = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role as any,
    };

    next();
  } catch (error) {
    if (error instanceof ApiError) {
      return res.status(error.statusCode).json(createErrorResponse(error.message, error.statusCode));
    }
    return res.status(401).json(createErrorResponse("Invalid or expired authorization token", 401));
  }
}

export function requireRole(roles: Array<string>) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.auth || !roles.includes(req.auth.role)) {
      return res.status(403).json(createErrorResponse("Insufficient permissions", 403));
    }
    next();
  };
}
