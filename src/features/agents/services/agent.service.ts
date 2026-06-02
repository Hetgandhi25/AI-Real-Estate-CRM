import { apiDelete, apiGet, apiPost, apiPut } from "@/api";
import { API_ENDPOINTS } from "@/api/endpoints";
import { env } from "@/config";
import type { Agent } from "@/types";

const createMockAgent = (payload: Partial<Agent>, id = `mock-${Date.now()}`): Agent => ({
  id,
  userId: payload.userId ?? `user-${Date.now()}`,
  name: payload.name ?? "Agent Mock",
  email: payload.email ?? "agent.mock@yandoxcrm.com",
  role: "agent",
  experience: payload.experience ?? 3,
  specialization: payload.specialization ?? "Residential Sales",
  performanceScore: payload.performanceScore ?? 76,
});

export async function getAgents(filters?: { search?: string }): Promise<Agent[]> {
  if (env.VITE_MOCK_AUTH) {
    return [
      createMockAgent({ name: "Jordan Blake", email: "jordan@yandoxcrm.com", experience: 7, specialization: "Sales", performanceScore: 88 }),
      createMockAgent({ name: "Sasha Reed", email: "sasha@yandoxcrm.com", experience: 5, specialization: "Rentals", performanceScore: 80 }),
    ];
  }

  return apiGet<Agent[]>(API_ENDPOINTS.agents.list, {
    params: filters,
  });
}

export async function createAgent(payload: Partial<Agent> & { password: string }): Promise<Agent> {
  if (env.VITE_MOCK_AUTH) {
    return createMockAgent(payload as Partial<Agent>);
  }

  return apiPost<Agent, Partial<Agent> & { password: string }>(API_ENDPOINTS.agents.create, payload);
}

export async function updateAgent(id: string, payload: Partial<Agent> & { password?: string }): Promise<Agent> {
  if (env.VITE_MOCK_AUTH) {
    return createMockAgent({ ...payload, id });
  }

  return apiPut<Agent, Partial<Agent> & { password?: string }>(API_ENDPOINTS.agents.update(id), payload);
}

export async function deleteAgent(id: string): Promise<void> {
  if (env.VITE_MOCK_AUTH) {
    return;
  }

  return apiDelete<void>(API_ENDPOINTS.agents.delete(id));
}
