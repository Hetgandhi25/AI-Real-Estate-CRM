import type { Request, Response, NextFunction } from "express";
import * as leadService from "./lead.service.js";
import { createSuccessResponse, createErrorResponse } from "../../common/lib/api-response.js";

export async function listLeads(req: Request, res: Response, next: NextFunction) {
  try {
    const { page = 1, pageSize = 50, status, agentId, search } = req.query as any;
    const result = await leadService.listLeads({ page: Number(page), pageSize: Number(pageSize), status, agentId, search });
    return res.status(200).json(createSuccessResponse(result));
  } catch (error) {
    next(error);
  }
}

export async function getLead(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const lead = await leadService.getLeadById(id);
    if (!lead) return res.status(404).json(createErrorResponse("Lead not found", 404));
    return res.status(200).json(createSuccessResponse(lead));
  } catch (error) {
    next(error);
  }
}

export async function createLead(req: Request, res: Response, next: NextFunction) {
  try {
    const created = await leadService.createLead(req.body);
    return res.status(201).json(createSuccessResponse(created));
  } catch (error) {
    next(error);
  }
}

export async function updateLead(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const updated = await leadService.updateLead(id, req.body);
    return res.status(200).json(createSuccessResponse(updated));
  } catch (error) {
    next(error);
  }
}

export async function deleteLead(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    await leadService.deleteLead(id);
    return res.status(204).send();
  } catch (error) {
    next(error);
  }
}
