import type { AnyZodObject } from "zod";
import type { Request, Response, NextFunction } from "express";
import { createErrorResponse } from "../lib/api-response.js";

export function validateRequest(schema: AnyZodObject, property: "body" | "params" | "query" = "body") {
  return (req: Request, res: Response, next: NextFunction) => {
    const payload = req[property];
    const result = schema.safeParse(payload);
    if (!result.success) {
      const message = result.error.errors.map((issue) => issue.message).join(", ");
      return res.status(400).json(createErrorResponse(message, 400));
    }
    req[property] = result.data;
    next();
  };
}
