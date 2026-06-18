import { NextFunction, Request, Response } from "express";
import { createErrorResponse } from "../lib/api-response.js";
import { ApiError } from "../lib/api-error.js";
import { Prisma } from "@prisma/client";

export function errorHandler(err: unknown, req: Request, res: Response, next: NextFunction) {
  console.error(err);

  // Prisma unique constraint violation → 409 Conflict
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      const field = (err.meta?.target as string[])?.join(", ") ?? "field";
      return res.status(409).json(createErrorResponse(`A record with this ${field} already exists.`, 409));
    }
    // Record not found
    if (err.code === "P2025") {
      return res.status(404).json(createErrorResponse("Record not found.", 404));
    }
    // Foreign key constraint violation
    if (err.code === "P2003" || (err.message && err.message.includes("violates RESTRICT setting"))) {
      return res.status(409).json(createErrorResponse("Cannot delete because related records exist.", 409));
    }
  }

  // Handle Unknown Request Errors for Postgres 23001 RESTRICT
  if (err instanceof Prisma.PrismaClientUnknownRequestError && err.message && err.message.includes("violates RESTRICT setting")) {
    return res.status(409).json(createErrorResponse("Cannot delete because related records exist.", 409));
  }

  // Prisma validation error
  if (err instanceof Prisma.PrismaClientValidationError) {
    return res.status(400).json(createErrorResponse("Invalid data provided.", 400));
  }

  const statusCode = err instanceof ApiError ? err.statusCode : 500;
  const message = err instanceof Error ? err.message : "Internal server error";

  res.status(statusCode).json(createErrorResponse(message, statusCode));
}
