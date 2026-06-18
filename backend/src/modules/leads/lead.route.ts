import { Router } from "express";
import { createLead, updateLead, getLead, listLeads, deleteLead } from "./lead.controller.js";
import { requireAuth } from "../../common/middleware/auth.middleware.js";
import { validateRequest } from "../../common/validators/validate.middleware.js";
import { z } from "zod";

const router = Router();
const idParam = z.object({ id: z.string().uuid() });

const leadCreateSchema = z.object({
  customerId: z.string().uuid(),
  propertyId: z.string().uuid(),
  source: z.string().min(1),
  notes: z.string().optional(),
  assignedAgentId: z.string().uuid().optional(),
  status: z.string().optional()
});
const leadUpdateSchema = leadCreateSchema.partial();

router.post("/", requireAuth, validateRequest(leadCreateSchema), createLead);
router.get("/", requireAuth, listLeads);
router.get("/:id", requireAuth, validateRequest(idParam, "params"), getLead);
router.put("/:id", requireAuth, validateRequest(idParam, "params"), validateRequest(leadUpdateSchema), updateLead);
router.delete("/:id", requireAuth, validateRequest(idParam, "params"), deleteLead);

export { router as leadRouter };
