import { Router } from "express";
import { createLead, updateLead, getLead, listLeads, deleteLead } from "./lead.controller.js";
import { requireAuth } from "../../common/middleware/auth.middleware.js";
import { validateRequest } from "../../common/validators/validate.middleware.js";
import { z } from "zod";

const router = Router();
const idParam = z.object({ id: z.string().uuid() });

router.post("/", requireAuth, createLead);
router.get("/", requireAuth, listLeads);
router.get("/:id", requireAuth, validateRequest(idParam, "params"), getLead);
router.put("/:id", requireAuth, validateRequest(idParam, "params"), updateLead);
router.delete("/:id", requireAuth, validateRequest(idParam, "params"), deleteLead);

export { router as leadRouter };
