import { Router } from "express";
import { authRouter } from "../modules/auth/auth.route.js";
import { healthRouter } from "../modules/health/health.route.js";
import { propertyRouter } from "../modules/properties/property.route.js";
import { leadRouter } from "../modules/leads/lead.route.js";
import { dashboardRouter } from "../modules/dashboard/dashboard.route.js";
import { customerRouter } from "../modules/customers/customer.route.js";
import { agentRouter } from "../modules/agents/agent.route.js";
import { conversationRouter } from "../modules/conversations/conversation.route.js";
import { reviewRouter } from "../modules/reviews/review.route.js";
import { appointmentRouter } from "../modules/appointments/appointment.route.js";
import { aiBotRouter } from "../modules/ai-bot/ai-bot.route.js";
import { whatsappRouter } from "../modules/whatsapp/whatsapp.route.js";

export const apiRouter = Router();
apiRouter.use("/auth", authRouter);
apiRouter.use("/health", healthRouter);
apiRouter.use("/properties", propertyRouter);
apiRouter.use("/dashboard", dashboardRouter);
apiRouter.use("/customers", customerRouter);
apiRouter.use("/leads", leadRouter);
apiRouter.use("/agents", agentRouter);
apiRouter.use("/conversations", conversationRouter);
apiRouter.use("/reviews", reviewRouter);
apiRouter.use("/appointments", appointmentRouter);
apiRouter.use("/ai-bot", aiBotRouter);
apiRouter.use("/whatsapp/webhook", whatsappRouter);

