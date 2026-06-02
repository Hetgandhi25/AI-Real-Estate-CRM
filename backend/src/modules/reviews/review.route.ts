import { Router } from "express";
import { createReview, deleteReview, getReview, listReviews, updateReview } from "./review.controller.js";
import { requireAuth } from "../../common/middleware/auth.middleware.js";
import { validateRequest } from "../../common/validators/validate.middleware.js";
import { z } from "zod";

const router = Router();
const idParam = z.object({ id: z.string().uuid() });

const reviewCreateSchema = z.object({
  customerId: z.string().uuid(),
  reviewerName: z.string().min(1),
  rating: z.number().min(1).max(5),
  comment: z.string().min(1),
});

const reviewUpdateSchema = reviewCreateSchema.partial();

router.get("/", requireAuth, listReviews);
router.get("/:id", requireAuth, validateRequest(idParam, "params"), getReview);
router.post("/", requireAuth, validateRequest(reviewCreateSchema), createReview);
router.put("/:id", requireAuth, validateRequest(idParam, "params"), validateRequest(reviewUpdateSchema), updateReview);
router.delete("/:id", requireAuth, validateRequest(idParam, "params"), deleteReview);

export { router as reviewRouter };
