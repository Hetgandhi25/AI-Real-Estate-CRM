import { prisma } from "../../prisma/index.js";
import { ApiError } from "../../common/lib/api-error.js";

type AppointmentPayload = {
  customerId?: string;
  propertyId?: string | null;
  assignedAgentId?: string | null;
  scheduledAt?: string;
  status?: string;
  notes?: string | null;
};

export async function listAppointments(params?: { search?: string; status?: string }) {
  const where: any = {};
  if (params?.status && params.status !== "all") {
    where.status = params.status;
  }
  if (params?.search) {
    const q = params.search;
    where.OR = [
      { status: { contains: q, mode: "insensitive" } },
      { notes: { contains: q, mode: "insensitive" } },
      {
        customer: {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
          ],
        },
      },
      {
        property: {
          title: { contains: q, mode: "insensitive" },
        },
      },
    ];
  }

  return prisma.appointment.findMany({
    where,
    include: { customer: true, property: true, assignedAgent: true },
    orderBy: { scheduledAt: "asc" },
  });
}

export async function getAppointmentById(id: string) {
  return prisma.appointment.findUnique({
    where: { id },
    include: { customer: true, property: true, assignedAgent: true },
  });
}

export async function createAppointment(payload: AppointmentPayload) {
  if (!payload.customerId || !payload.scheduledAt) {
    throw new ApiError(400, "customerId and scheduledAt are required.");
  }

  const scheduledAt = new Date(payload.scheduledAt);
  if (Number.isNaN(scheduledAt.getTime())) {
    throw new ApiError(400, "A valid scheduledAt date is required.");
  }

  return prisma.appointment.create({
    data: {
      customerId: payload.customerId,
      propertyId: payload.propertyId ?? null,
      assignedAgentId: payload.assignedAgentId ?? null,
      scheduledAt,
      status: payload.status ?? "SCHEDULED",
      notes: payload.notes ?? null,
    },
    include: { customer: true, property: true, assignedAgent: true },
  });
}

export async function updateAppointment(id: string, payload: AppointmentPayload) {
  const appointment = await prisma.appointment.findUnique({ where: { id } });
  if (!appointment) {
    throw new ApiError(404, "Appointment not found");
  }

  const data: any = {};
  if (payload.customerId) data.customerId = payload.customerId;
  if (payload.propertyId !== undefined) data.propertyId = payload.propertyId;
  if (payload.assignedAgentId !== undefined) data.assignedAgentId = payload.assignedAgentId;
  if (payload.scheduledAt) {
    const scheduledAt = new Date(payload.scheduledAt);
    if (Number.isNaN(scheduledAt.getTime())) {
      throw new ApiError(400, "A valid scheduledAt date is required.");
    }
    data.scheduledAt = scheduledAt;
  }
  if (payload.status) data.status = payload.status;
  if (payload.notes !== undefined) data.notes = payload.notes;

  return prisma.appointment.update({
    where: { id },
    data,
    include: { customer: true, property: true, assignedAgent: true },
  });
}

export async function deleteAppointment(id: string) {
  const appointment = await prisma.appointment.findUnique({ where: { id } });
  if (!appointment) {
    throw new ApiError(404, "Appointment not found");
  }

  await prisma.appointment.delete({ where: { id } });
}
