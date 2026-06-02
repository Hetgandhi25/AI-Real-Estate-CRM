import { Request, Response } from "express";
import { createSuccessResponse } from "../../common/lib/api-response.js";

export function getHealth(req: Request, res: Response) {
  return res.status(200).json(
    createSuccessResponse({
      status: "ok",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    }),
  );
}
