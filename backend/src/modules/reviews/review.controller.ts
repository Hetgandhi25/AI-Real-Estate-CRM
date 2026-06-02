import type { Request, Response, NextFunction } from "express";
import * as reviewService from "./review.service.js";
import { createSuccessResponse, createErrorResponse } from "../../common/lib/api-response.js";

export async function listReviews(req: Request, res: Response, next: NextFunction) {
  try {
    const { search } = req.query as any;
    const data = await reviewService.listReviews({ search });
    return res.status(200).json(createSuccessResponse(data));
  } catch (error) {
    next(error);
  }
}

export async function getReview(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const review = await reviewService.getReviewById(id);
    if (!review) {
      return res.status(404).json(createErrorResponse("Review not found", 404));
    }
    return res.status(200).json(createSuccessResponse(review));
  } catch (error) {
    next(error);
  }
}

export async function createReview(req: Request, res: Response, next: NextFunction) {
  try {
    const created = await reviewService.createReview(req.body);
    return res.status(201).json(createSuccessResponse(created));
  } catch (error) {
    next(error);
  }
}

export async function updateReview(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const updated = await reviewService.updateReview(id, req.body);
    return res.status(200).json(createSuccessResponse(updated));
  } catch (error) {
    next(error);
  }
}

export async function deleteReview(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    await reviewService.deleteReview(id);
    return res.status(204).send();
  } catch (error) {
    next(error);
  }
}
