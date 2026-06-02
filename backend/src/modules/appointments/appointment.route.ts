import { Router } from "express";
import { createAppointment, deleteAppointment, getAppointment, listAppointments, updateAppointment } from "./appointment.controller.js";
import { requireAuth } from "../../common/middleware/auth.middleware.js";
import { validateRequest } from "../../common/validators/validate.middleware.js";
import { z } from "zod";

const router = Router();
const idParam = z.object({ id: z.string().uuid() });

const appointmentCreateSchema = z.object({
  customerId: z.string().uuid(),
  propertyId: z.string().uuid().optional(),
  assignedAgentId: z.string().uuid().optional(),
  scheduledAt: z.string().refine((value) => !Number.isNaN(Date.parse(value)), { message: "Invalid date" }),
  status: z.enum(["SCHEDULED", "CONFIRMED", "CANCELLED", "COMPLETED"]).optional(),
  notes: z.string().optional(),
});

const appointmentUpdateSchema = appointmentCreateSchema.partial();

router.get("/", requireAuth, listAppointments);
router.get("/:id", requireAuth, validateRequest(idParam, "params"), getAppointment);
router.post("/", requireAuth, validateRequest(appointmentCreateSchema), createAppointment);
router.put("/:id", requireAuth, validateRequest(idParam, "params"), validateRequest(appointmentUpdateSchema), updateAppointment);
router.delete("/:id", requireAuth, validateRequest(idParam, "params"), deleteAppointment);

export { router as appointmentRouter };
