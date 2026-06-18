import { Request, Response, NextFunction } from "express";
import { AnyZodObject, ZodError } from "zod";
import { createErrorResponse } from "../lib/api-response.js";

export const validateRequest = (schema: AnyZodObject) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const formattedErrors: Record<string, string[]> = {};
        for (const e of error.errors) {
           const path = e.path.join(".");
           if (!formattedErrors[path]) formattedErrors[path] = [];
           formattedErrors[path].push(e.message);
        }
        return res.status(400).json(
          createErrorResponse("Validation failed", 400, "VALIDATION_ERROR", formattedErrors)
        );
      }
      next(error);
    }
  };
};
