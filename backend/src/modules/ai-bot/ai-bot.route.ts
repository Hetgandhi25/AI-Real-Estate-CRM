import { Router } from "express";
import { requireAuth, requireRole } from "../../common/middleware/auth.middleware.js";
import { rateLimiter } from "../../common/middleware/rate-limiter.middleware.js";
import { logAction } from "../../common/middleware/audit-log.middleware.js";
import * as aiBotController from "./ai-bot.controller.js";

const router = Router();

// Apply auth, RBAC, and rate limiting to all AI Bot analytics endpoints
router.use(requireAuth);
router.use(requireRole(["admin", "agent"]));
router.use(rateLimiter);


router.get("/summary", logAction("GET_AI_SUMMARY"), aiBotController.getSummary);
router.get("/sessions", logAction("GET_AI_SESSIONS"), aiBotController.getSessions);
router.get("/leads", logAction("GET_AI_LEADS"), aiBotController.getLeads);
router.get("/visits", logAction("GET_AI_VISITS"), aiBotController.getSiteVisits);

export { router as aiBotRouter };
