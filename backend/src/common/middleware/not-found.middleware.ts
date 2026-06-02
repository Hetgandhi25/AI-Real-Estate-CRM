import { Request, Response } from "express";
import { createErrorResponse } from "../lib/api-response.js";

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json(createErrorResponse("Route not found", 404));
}
