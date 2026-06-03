import type { Request, Response, NextFunction } from "express";
import * as aiBotService from "./ai-bot.service.js";
import { createSuccessResponse } from "../../common/lib/api-response.js";
import { createAuditLog } from "../../common/middleware/audit-log.middleware.js";

export async function getSummary(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await aiBotService.getAiBotSummary();
    await createAuditLog(req.auth?.id || null, "VIEW_AI_ANALYTICS", "User viewed AI Bot KPIs and graphs");
    return res.status(200).json(createSuccessResponse(data));
  } catch (error) {
    next(error);
  }
}

export async function getSessions(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await aiBotService.getActiveSessions();
    return res.status(200).json(createSuccessResponse(data));
  } catch (error) {
    next(error);
  }
}

export async function getLeads(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await aiBotService.getBotLeads();
    return res.status(200).json(createSuccessResponse(data));
  } catch (error) {
    next(error);
  }
}

export async function getSiteVisits(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await aiBotService.getBotSiteVisits();
    return res.status(200).json(createSuccessResponse(data));
  } catch (error) {
    next(error);
  }
}
