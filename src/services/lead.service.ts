import { apiDelete, apiGet, apiPost, apiPut } from "@/api";
import { API_ENDPOINTS } from "@/api/endpoints";
import { env } from "@/config";
import type { Lead, PaginatedResponse } from "@/types";

const createMockLead = (payload: Partial<Lead>, id = `mock-${Date.now()}`): Lead => ({
  id,
  customerId: payload.customerId ?? "mock-customer-id",
  propertyId: payload.propertyId ?? "mock-property-id",
  status: payload.status ?? "NEW",
  source: payload.source ?? "WEBSITE",
  notes: payload.notes,
  assignedAgentId: payload.assignedAgentId,
});

export async function getLeads(search?: string): Promise<Lead[]> {
  if (env.VITE_MOCK_AUTH) {
    return [createMockLead({ status: "NEW" }), createMockLead({ status: "CONTACTED" })];
  }

  const raw = await apiGet<PaginatedResponse<Lead>>(API_ENDPOINTS.leads.list, {
    params: search ? { search } : undefined,
  });
  return raw.data;
}

export async function getLeadById(id: string): Promise<Lead | undefined> {
  if (env.VITE_MOCK_AUTH) {
    return createMockLead({ id, status: "NEW" }, id);
  }

  return apiGet<Lead>(API_ENDPOINTS.leads.detail(id));
}

export async function createLead(payload: Partial<Lead>): Promise<Lead> {
  if (env.VITE_MOCK_AUTH) {
    return createMockLead(payload);
  }

  return apiPost<Lead, Partial<Lead>>(API_ENDPOINTS.leads.create, payload);
}

export async function updateLead(id: string, payload: Partial<Lead>): Promise<Lead> {
  if (env.VITE_MOCK_AUTH) {
    return createMockLead({ ...payload, id }, id);
  }

  return apiPut<Lead, Partial<Lead>>(API_ENDPOINTS.leads.update(id), payload);
}

export async function deleteLead(id: string): Promise<void> {
  if (env.VITE_MOCK_AUTH) {
    return;
  }

  return apiDelete<void>(API_ENDPOINTS.leads.delete(id));
}
