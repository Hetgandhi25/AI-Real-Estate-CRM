import { apiDelete, apiGet, apiPost, apiPut } from "@/api";
import { API_ENDPOINTS } from "@/api/endpoints";
import { env } from "@/config";
import type { Conversation, ConversationMessage } from "@/types";

const createMockConversation = (payload: Partial<Conversation>, id = `mock-${Date.now()}`): Conversation => ({
  id,
  customerId: payload.customerId ?? "mock-customer-id",
  customer: payload.customer,
  messages: payload.messages ?? [{ from: "customer", text: "Hello, I need help with my listing." }],
  aiSummary: payload.aiSummary ?? "Customer is asking for assistance with an active listing.",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

export async function getConversations(filters?: { search?: string }): Promise<Conversation[]> {
  if (env.VITE_MOCK_AUTH) {
    const list = [
      createMockConversation({
        customerId: "cust-1",
        messages: [
          { from: "customer", text: "Do you have units available in Palo Alto?" },
          { from: "agent", text: "Yes, I can schedule a tour this week." },
        ],
      }),
      createMockConversation({
        customerId: "cust-2",
        messages: [{ from: "customer", text: "I need financing options." }],
        aiSummary: "Customer requested financing information.",
      }),
    ];
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      return list.filter(c => c.aiSummary?.toLowerCase().includes(q) || c.messages.some(m => m.text.toLowerCase().includes(q)));
    }
    return list;
  }
  return apiGet<Conversation[]>(API_ENDPOINTS.conversations.list, {
    params: filters,
  });
}

export async function getConversationById(id: string): Promise<Conversation> {
  return apiGet<Conversation>(API_ENDPOINTS.conversations.detail(id));
}

export async function createConversation(payload: {
  customerId: string;
  messages: ConversationMessage[];
  aiSummary?: string;
}): Promise<Conversation> {
  if (env.VITE_MOCK_AUTH) return createMockConversation(payload);
  return apiPost<Conversation, typeof payload>(API_ENDPOINTS.conversations.create, payload);
}

export async function addMessage(
  id: string,
  payload: { text: string; from?: string; withAiResponse?: boolean }
): Promise<Conversation> {
  return apiPost<Conversation, typeof payload>(
    `${API_ENDPOINTS.conversations.detail(id)}/messages`,
    payload
  );
}

export async function updateConversation(
  id: string,
  payload: Partial<{ messages: ConversationMessage[]; aiSummary?: string }>
): Promise<Conversation> {
  if (env.VITE_MOCK_AUTH) return createMockConversation({ ...payload, id } as Partial<Conversation>, id);
  return apiPut<Conversation, typeof payload>(API_ENDPOINTS.conversations.update(id), payload);
}

export async function deleteConversation(id: string): Promise<void> {
  if (env.VITE_MOCK_AUTH) return;
  return apiDelete<void>(API_ENDPOINTS.conversations.delete(id));
}
