import { Router } from "express";
import { createCustomer, listCustomers, getCustomer, updateCustomer, deleteCustomer } from "./customer.controller.js";
import { requireAuth } from "../../common/middleware/auth.middleware.js";
import { validateRequest } from "../../common/validators/validate.middleware.js";
import { z } from "zod";

const router = Router();

const idParam = z.object({ id: z.string().uuid() });
const customerCreateSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(1),
  email: z.string().email(),
  budget: z.number().optional(),
  preferredLocation: z.string().optional(),
  notes: z.string().optional(),
});
const customerUpdateSchema = customerCreateSchema.partial();

router.post("/", requireAuth, validateRequest(customerCreateSchema), createCustomer);
router.get("/", requireAuth, listCustomers);
router.get("/:id", requireAuth, validateRequest(idParam, "params"), getCustomer);
router.put("/:id", requireAuth, validateRequest(idParam, "params"), validateRequest(customerUpdateSchema), updateCustomer);
router.delete("/:id", requireAuth, validateRequest(idParam, "params"), deleteCustomer);

export { router as customerRouter };
