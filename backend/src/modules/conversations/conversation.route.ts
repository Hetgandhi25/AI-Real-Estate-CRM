import { Router } from "express";
import {
  createConversation,
  deleteConversation,
  getConversation,
  listConversations,
  updateConversation,
  addMessage,
} from "./conversation.controller.js";
import { requireAuth } from "../../common/middleware/auth.middleware.js";
import { validateRequest } from "../../common/validators/validate.middleware.js";
import { z } from "zod";

const router = Router();
const idParam = z.object({ id: z.string().uuid() });

const conversationCreateSchema = z.object({
  customerId: z.string().uuid(),
  messages: z.array(z.object({ from: z.string().min(1), text: z.string().min(1) })).min(1),
  aiSummary: z.string().optional(),
});

const conversationUpdateSchema = z.object({
  messages: z
    .array(z.object({ from: z.string().min(1), text: z.string().min(1) }))
    .optional(),
  aiSummary: z.string().optional(),
});

const addMessageSchema = z.object({
  text: z.string().min(1),
  from: z.enum(["agent", "customer", "ai"]).optional(),
  withAiResponse: z.boolean().optional(),
});

router.get("/", requireAuth, listConversations);
router.get("/:id", requireAuth, validateRequest(idParam, "params"), getConversation);
router.post("/", requireAuth, validateRequest(conversationCreateSchema), createConversation);
router.post(
  "/:id/messages",
  requireAuth,
  validateRequest(idParam, "params"),
  validateRequest(addMessageSchema),
  addMessage
);
router.put(
  "/:id",
  requireAuth,
  validateRequest(idParam, "params"),
  validateRequest(conversationUpdateSchema),
  updateConversation
);
router.delete("/:id", requireAuth, validateRequest(idParam, "params"), deleteConversation);

export { router as conversationRouter };
