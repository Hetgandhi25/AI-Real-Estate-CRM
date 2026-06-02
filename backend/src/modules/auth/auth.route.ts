import { Router } from "express";
import { register, login, refresh, logout, me, updateProfile } from "./auth.controller.js";
import { validateRequest } from "../../common/validators/validate.middleware.js";
import { registerSchema, loginSchema, refreshSchema, logoutSchema } from "../../common/validators/auth.validator.js";
import { requireAuth } from "../../common/middleware/auth.middleware.js";
import { z } from "zod";

const router = Router();

router.post("/register", validateRequest(registerSchema), register);
router.post("/login", validateRequest(loginSchema), login);
router.post("/refresh", validateRequest(refreshSchema), refresh);
// Logout optionally accepts auth header (if token still valid) to clear by userId, else clears by refresh token body
router.post("/logout", (req, res, next) => {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    return requireAuth(req, res, next);
  }
  next();
}, validateRequest(logoutSchema), logout);
router.get("/me", requireAuth, me);
router.put(
  "/me",
  requireAuth,
  validateRequest(
    z.object({
      name: z.string().min(1).optional(),
      email: z.string().email().optional(),
      password: z.string().min(8).optional(),
    })
  ),
  updateProfile
);

export { router as authRouter };
