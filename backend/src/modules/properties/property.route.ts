import { Router } from "express";
import {
  listProperties,
  getProperty,
  createProperty,
  updateProperty,
  deleteProperty,
} from "./property.controller.js";
import { validateRequest } from "../../common/validators/validate.middleware.js";
import { requireAuth } from "../../common/middleware/auth.middleware.js";
import { z } from "zod";

const router = Router();

const idParam = z.object({ id: z.string().uuid() });

const querySchema = z.object({
  page: z.coerce.number().positive().optional(),
  pageSize: z.coerce.number().positive().optional(),
  search: z.string().optional(),
  status: z.string().optional(),
  type: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  location: z.string().optional(),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  bhk: z.coerce.number().optional(),
  furnished: z.string().optional(),
  readyToMove: z.string().optional(),
  availability: z.string().optional(),
});

const propertyPayloadSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  price: z.coerce.number().nonnegative(),
  city: z.string().min(1),
  state: z.string().min(1),
  address: z.string().min(1),
  propertyType: z.string().min(1),
  bhk: z.coerce.number().int().positive(),
  bathrooms: z.coerce.number().int().positive(),
  area: z.string().min(1),
  status: z.string().default("FOR_SALE"),
  availability: z.enum(["Available", "Not Available"]).default("Available").optional(),
  amenities: z.array(z.string()).optional().default([]),
  images: z.array(z.string()).optional().default([]),
});

const propertyUpdateSchema = propertyPayloadSchema.partial();

router.get("/", (req, res, next) => validateRequest(querySchema, "query")(req, res, next), listProperties);
router.get("/:id", (req, res, next) => validateRequest(idParam, "params")(req, res, next), getProperty);
router.post("/", requireAuth, validateRequest(propertyPayloadSchema), createProperty);
router.put(
  "/:id",
  requireAuth,
  (req, res, next) => validateRequest(idParam, "params")(req, res, next),
  validateRequest(propertyUpdateSchema),
  updateProperty,
);
router.delete("/:id", requireAuth, (req, res, next) => validateRequest(idParam, "params")(req, res, next), deleteProperty);

export { router as propertyRouter };
