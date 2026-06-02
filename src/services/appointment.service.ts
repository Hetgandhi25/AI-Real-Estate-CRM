import { apiDelete, apiGet, apiPost, apiPut } from "@/api";
import { API_ENDPOINTS } from "@/api/endpoints";
import { env } from "@/config";
import type { Appointment } from "@/types";

const createMockAppointment = (payload: Partial<Appointment>, id = `mock-${Date.now()}`): Appointment => ({
  id,
  customerId: payload.customerId ?? "mock-customer-id",
  propertyId: payload.propertyId ?? null,
  assignedAgentId: payload.assignedAgentId ?? null,
  scheduledAt: payload.scheduledAt ?? new Date().toISOString(),
  status: payload.status ?? "SCHEDULED",
  notes: payload.notes ?? "Meeting has been scheduled.",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

export async function getAppointments(filters?: { search?: string; status?: string }): Promise<Appointment[]> {
  if (env.VITE_MOCK_AUTH) {
    return [
      createMockAppointment({ customerId: "cust-1", scheduledAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(), status: "CONFIRMED" }),
      createMockAppointment({ customerId: "cust-2", scheduledAt: new Date(Date.now() + 96 * 60 * 60 * 1000).toISOString(), status: "SCHEDULED" }),
    ];
  }

  return apiGet<Appointment[]>(API_ENDPOINTS.appointments.list, {
    params: filters,
  });
}

export async function createAppointment(payload: Partial<Appointment>): Promise<Appointment> {
  if (env.VITE_MOCK_AUTH) {
    return createMockAppointment(payload);
  }

  return apiPost<Appointment, Partial<Appointment>>(API_ENDPOINTS.appointments.create, payload);
}

export async function updateAppointment(id: string, payload: Partial<Appointment>): Promise<Appointment> {
  if (env.VITE_MOCK_AUTH) {
    return createMockAppointment({ ...payload, id } as Partial<Appointment>, id);
  }

  return apiPut<Appointment, Partial<Appointment>>(API_ENDPOINTS.appointments.update(id), payload);
}

export async function deleteAppointment(id: string): Promise<void> {
  if (env.VITE_MOCK_AUTH) {
    return;
  }

  return apiDelete<void>(API_ENDPOINTS.appointments.delete(id));
}
