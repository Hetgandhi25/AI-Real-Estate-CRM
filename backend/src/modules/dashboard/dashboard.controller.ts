import type { Request, Response, NextFunction } from "express";
import * as dashboardService from "./dashboard.service.js";
import { createSuccessResponse } from "../../common/lib/api-response.js";

export async function getDashboardSummary(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await dashboardService.getDashboardSummary();
    return res.status(200).json(createSuccessResponse(data));
  } catch (error) {
    next(error);
  }
}

export async function getAnalyticsSummary(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await dashboardService.getAnalyticsSummary();
    return res.status(200).json(createSuccessResponse(data));
  } catch (error) {
    next(error);
  }
}

export async function getGlobalSearch(req: Request, res: Response, next: NextFunction) {
  try {
    const { q = "" } = req.query as any;
    const data = await dashboardService.getGlobalSearch(String(q));
    return res.status(200).json(createSuccessResponse(data));
  } catch (error) {
    next(error);
  }
}
