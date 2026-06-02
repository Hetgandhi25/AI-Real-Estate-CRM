import type { Request, Response, NextFunction } from "express";
import * as agentService from "./agent.service.js";
import { createSuccessResponse, createErrorResponse } from "../../common/lib/api-response.js";

export async function listAgents(req: Request, res: Response, next: NextFunction) {
  try {
    const { search } = req.query as any;
    const data = await agentService.listAgents({ search });
    return res.status(200).json(createSuccessResponse(data));
  } catch (error) {
    next(error);
  }
}

export async function getAgent(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const agent = await agentService.getAgentById(id);
    if (!agent) {
      return res.status(404).json(createErrorResponse("Agent not found", 404));
    }
    return res.status(200).json(createSuccessResponse(agent));
  } catch (error) {
    next(error);
  }
}

export async function createAgent(req: Request, res: Response, next: NextFunction) {
  try {
    const created = await agentService.createAgent(req.body);
    return res.status(201).json(createSuccessResponse(created));
  } catch (error) {
    next(error);
  }
}

export async function updateAgent(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const updated = await agentService.updateAgent(id, req.body);
    return res.status(200).json(createSuccessResponse(updated));
  } catch (error) {
    next(error);
  }
}

export async function deleteAgent(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    await agentService.deleteAgent(id);
    return res.status(204).send();
  } catch (error) {
    next(error);
  }
}
