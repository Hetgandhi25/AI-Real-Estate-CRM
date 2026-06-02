import { Router } from "express";
import { createAgent, deleteAgent, getAgent, listAgents, updateAgent } from "./agent.controller.js";
import { requireAuth, requireRole } from "../../common/middleware/auth.middleware.js";
import { validateRequest } from "../../common/validators/validate.middleware.js";
import { z } from "zod";

const router = Router();
const idParam = z.object({ id: z.string().uuid() });

const agentCreateSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  experience: z.number().int().min(0).optional(),
  specialization: z.string().optional(),
  performanceScore: z.number().min(0).max(100).optional(),
});

const agentUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  password: z.string().min(8).optional(),
  experience: z.number().int().min(0).optional(),
  specialization: z.string().optional(),
  performanceScore: z.number().min(0).max(100).optional(),
});

const adminOrManager = ["admin", "manager"];

router.get("/", requireAuth, requireRole(adminOrManager), listAgents);
router.get("/:id", requireAuth, requireRole(adminOrManager), validateRequest(idParam, "params"), getAgent);
router.post("/", requireAuth, requireRole(adminOrManager), validateRequest(agentCreateSchema), createAgent);
router.put("/:id", requireAuth, requireRole(adminOrManager), validateRequest(idParam, "params"), validateRequest(agentUpdateSchema), updateAgent);
router.delete("/:id", requireAuth, requireRole(adminOrManager), validateRequest(idParam, "params"), deleteAgent);

export { router as agentRouter };
