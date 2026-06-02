import type { Request, Response, NextFunction } from "express";
import * as propertyService from "./property.service.js";
import { createSuccessResponse, createErrorResponse } from "../../common/lib/api-response.js";

export async function listProperties(req: Request, res: Response, next: NextFunction) {
  try {
    const { page, pageSize, ...filters } = req.query;
    const result = await propertyService.listProperties({
      page: Number(page) || 1,
      pageSize: Number(pageSize) || 50,
      filters: filters as Record<string, string>,
    });
    return res.status(200).json(createSuccessResponse(result));
  } catch (error) {
    next(error);
  }
}

export async function getProperty(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const property = await propertyService.getPropertyById(id);
    if (!property) return res.status(404).json(createErrorResponse("Property not found", 404));
    return res.status(200).json(createSuccessResponse(property));
  } catch (error) {
    next(error);
  }
}

export async function createProperty(req: Request, res: Response, next: NextFunction) {
  try {
    const payload = req.body;
    const userId = (req as any).auth.id;
    const created = await propertyService.createProperty(payload, userId);
    return res.status(201).json(createSuccessResponse(created));
  } catch (error) {
    next(error);
  }
}

export async function updateProperty(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const payload = req.body;
    const updated = await propertyService.updateProperty(id, payload);
    return res.status(200).json(createSuccessResponse(updated));
  } catch (error) {
    next(error);
  }
}

export async function deleteProperty(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    await propertyService.deleteProperty(id);
    return res.status(204).send();
  } catch (error) {
    next(error);
  }
}
