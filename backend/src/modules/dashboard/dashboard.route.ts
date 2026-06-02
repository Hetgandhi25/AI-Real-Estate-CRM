import { Router } from "express";
import { getDashboardSummary, getAnalyticsSummary, getGlobalSearch } from "./dashboard.controller.js";
import { requireAuth } from "../../common/middleware/auth.middleware.js";

const router = Router();
router.get("/summary", requireAuth, getDashboardSummary);
router.get("/analytics", requireAuth, getAnalyticsSummary);
router.get("/search", requireAuth, getGlobalSearch);

export { router as dashboardRouter };
