import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { env } from "../../config/env.js";

interface RawRequest extends Request {
  rawBody?: Buffer;
}

export const validateMetaSignature = (req: RawRequest, res: Response, next: NextFunction) => {
  // Allow bypass in development if secret is missing (credential waiting state)
  if (env.NODE_ENV === "development" && !env.META_APP_SECRET) {
    console.warn("⚠️ [Security] Bypassing Meta signature validation (NODE_ENV=development and META_APP_SECRET missing).");
    return next();
  }

  const signature = req.headers["x-hub-signature-256"] as string;
  if (!signature) {
    console.error("❌ [Security] Missing X-Hub-Signature-256 header.");
    return res.status(401).send("Missing signature");
  }

  if (!env.META_APP_SECRET) {
    console.error("❌ [Security] META_APP_SECRET is not configured but required for signature validation.");
    return res.status(500).send("Server configuration error");
  }

  if (!req.rawBody) {
    console.error("❌ [Security] Raw body missing from request. Cannot validate signature.");
    return res.status(500).send("Server configuration error");
  }

  const expectedSignature = `sha256=${crypto
    .createHmac("sha256", env.META_APP_SECRET)
    .update(req.rawBody)
    .digest("hex")}`;

  // Timing safe equal to prevent timing attacks
  try {
    const signatureBuffer = Buffer.from(signature, "ascii");
    const expectedBuffer = Buffer.from(expectedSignature, "ascii");

    if (signatureBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
      console.error("❌ [Security] Invalid X-Hub-Signature-256 header.");
      return res.status(401).send("Invalid signature");
    }
  } catch (err) {
    console.error("❌ [Security] Error validating signature length/format.");
    return res.status(401).send("Invalid signature format");
  }

  // Signature is valid
  next();
};
