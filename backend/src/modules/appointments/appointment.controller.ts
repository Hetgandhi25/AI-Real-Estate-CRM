import type { Request, Response, NextFunction } from "express";
import * as appointmentService from "./appointment.service.js";
import { createSuccessResponse, createErrorResponse } from "../../common/lib/api-response.js";

export async function listAppointments(req: Request, res: Response, next: NextFunction) {
  try {
    const { search, status } = req.query as any;
    const data = await appointmentService.listAppointments({ search, status });
    return res.status(200).json(createSuccessResponse(data));
  } catch (error) {
    next(error);
  }
}

export async function getAppointment(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const appointment = await appointmentService.getAppointmentById(id);
    if (!appointment) {
      return res.status(404).json(createErrorResponse("Appointment not found", 404));
    }
    return res.status(200).json(createSuccessResponse(appointment));
  } catch (error) {
    next(error);
  }
}

export async function createAppointment(req: Request, res: Response, next: NextFunction) {
  try {
    const created = await appointmentService.createAppointment(req.body);
    return res.status(201).json(createSuccessResponse(created));
  } catch (error) {
    next(error);
  }
}

export async function updateAppointment(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const updated = await appointmentService.updateAppointment(id, req.body);
    return res.status(200).json(createSuccessResponse(updated));
  } catch (error) {
    next(error);
  }
}

export async function deleteAppointment(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    await appointmentService.deleteAppointment(id);
    return res.status(204).send();
  } catch (error) {
    next(error);
  }
}
