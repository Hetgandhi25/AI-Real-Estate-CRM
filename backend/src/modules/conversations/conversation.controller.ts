import type { Request, Response, NextFunction } from "express";
import * as conversationService from "./conversation.service.js";
import { createSuccessResponse, createErrorResponse } from "../../common/lib/api-response.js";

export async function listConversations(req: Request, res: Response, next: NextFunction) {
  try {
    const { search } = req.query as any;
    const data = await conversationService.listConversations({ search });
    return res.status(200).json(createSuccessResponse(data));
  } catch (error) {
    next(error);
  }
}

export async function getConversation(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const conversation = await conversationService.getConversationById(id);
    if (!conversation) {
      return res.status(404).json(createErrorResponse("Conversation not found", 404));
    }
    return res.status(200).json(createSuccessResponse(conversation));
  } catch (error) {
    next(error);
  }
}

export async function createConversation(req: Request, res: Response, next: NextFunction) {
  try {
    const created = await conversationService.createConversation(req.body);
    return res.status(201).json(createSuccessResponse(created));
  } catch (error) {
    next(error);
  }
}

export async function updateConversation(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const updated = await conversationService.updateConversation(id, req.body);
    return res.status(200).json(createSuccessResponse(updated));
  } catch (error) {
    next(error);
  }
}

export async function addMessage(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { text, from = "agent", withAiResponse = false } = req.body;
    if (!text) {
      return res.status(400).json(createErrorResponse("message text is required", 400));
    }
    const updated = await conversationService.addMessageToConversation(
      id,
      { from, text },
      withAiResponse
    );
    return res.status(200).json(createSuccessResponse(updated));
  } catch (error) {
    next(error);
  }
}

export async function deleteConversation(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    await conversationService.deleteConversation(id);
    return res.status(204).send();
  } catch (error) {
    next(error);
  }
}
