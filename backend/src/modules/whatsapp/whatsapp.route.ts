import { Router } from "express";
import { verifyWebhook, processWebhook } from "./whatsapp.controller.js";
import { validateMetaSignature } from "../../common/middleware/meta-signature.middleware.js";

export const whatsappRouter = Router();

// Endpoint for Meta to verify the webhook URL
whatsappRouter.get("/", verifyWebhook);

// Endpoint for Meta to send incoming messages and events
whatsappRouter.post("/", validateMetaSignature, processWebhook);
