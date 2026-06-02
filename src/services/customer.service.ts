import { apiDelete, apiGet, apiPost, apiPut } from "@/api";
import { API_ENDPOINTS } from "@/api/endpoints";
import { env } from "@/config";
import type { Customer, PaginatedResponse } from "@/types";

const createMockCustomer = (payload: Partial<Customer>): Customer => ({
  id: `mock-${Date.now()}`,
  name: payload.name ?? "Mock Customer",
  email: payload.email ?? "mock@customer.local",
  phone: payload.phone ?? "0000000000",
  budget: payload.budget,
  preferredLocation: payload.preferredLocation,
  notes: payload.notes,
});

export async function getCustomers(filters?: { search?: string; whatsappOnly?: string | boolean; location?: string }): Promise<Customer[]> {
  if (env.VITE_MOCK_AUTH) {
    return [createMockCustomer({ name: "Mock Customer A" }), createMockCustomer({ name: "Mock Customer B" })];
  }

  const raw = await apiGet<PaginatedResponse<Customer>>(API_ENDPOINTS.customers.list, {
    params: filters,
  });
  return raw.data;
}

export async function getCustomerById(id: string): Promise<Customer | undefined> {
  if (env.VITE_MOCK_AUTH) {
    return createMockCustomer({ id, name: "Mock Customer" });
  }

  return apiGet<Customer>(API_ENDPOINTS.customers.detail(id));
}

export async function createCustomer(payload: Partial<Customer>): Promise<Customer> {
  if (env.VITE_MOCK_AUTH) {
    return createMockCustomer(payload);
  }

  return apiPost<Customer, Partial<Customer>>(API_ENDPOINTS.customers.create, payload);
}

export async function updateCustomer(id: string, payload: Partial<Customer>): Promise<Customer> {
  if (env.VITE_MOCK_AUTH) {
    return createMockCustomer({ ...payload, id });
  }

  return apiPut<Customer, Partial<Customer>>(API_ENDPOINTS.customers.update(id), payload);
}

export async function deleteCustomer(id: string): Promise<void> {
  if (env.VITE_MOCK_AUTH) {
    return;
  }

  return apiDelete<void>(API_ENDPOINTS.customers.delete(id));
}
