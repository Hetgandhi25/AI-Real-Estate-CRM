import { prisma } from "../../prisma/index.js";
import { ApiError } from "../../common/lib/api-error.js";

type ConversationMessage = { from: string; text: string; timestamp?: string };

type ConversationPayload = {
  customerId: string;
  messages: ConversationMessage[];
  aiSummary?: string;
};

type ConversationUpdatePayload = Partial<ConversationPayload>;

function parseConversation(conversation: any) {
  if (!conversation) return conversation;
  return {
    ...conversation,
    messages:
      typeof conversation.messages === "string"
        ? JSON.parse(conversation.messages)
        : conversation.messages,
  };
}

function serializeMessages(messages: ConversationMessage[]) {
  return JSON.stringify(messages);
}

/** Generate a structured mock AI response based on the last customer message */
function generateAiResponse(messages: ConversationMessage[], customerName: string): string {
  const lastCustomerMsg = [...messages].reverse().find((m) => m.from === "customer");
  const text = lastCustomerMsg?.text?.toLowerCase() ?? "";

  if (text.includes("tour") || text.includes("visit") || text.includes("view")) {
    return `Hi ${customerName}! I can schedule a property tour for you. Our agents are available Monday–Saturday, 9 AM–6 PM. Would you prefer a morning or afternoon slot?`;
  }
  if (text.includes("price") || text.includes("cost") || text.includes("budget")) {
    return `Great question! Based on your budget and preferences, I've identified 3 properties that match your criteria. I'll send you a detailed comparison report shortly.`;
  }
  if (text.includes("hoa") || text.includes("fee") || text.includes("maintenance")) {
    return `HOA fees vary by property and typically cover maintenance, security, and amenities. I'll pull the exact details for the properties you're interested in.`;
  }
  if (text.includes("mortgage") || text.includes("loan") || text.includes("finance")) {
    return `I can connect you with our trusted mortgage advisors who offer competitive rates. They can pre-qualify you within 24 hours. Shall I arrange a call?`;
  }
  if (text.includes("available") || text.includes("ready") || text.includes("move")) {
    return `I'll check the current availability for your preferred properties right away. Most of our listings have flexible move-in timelines. I'll get back to you with exact dates.`;
  }
  return `Thank you for reaching out, ${customerName}! I've reviewed your inquiry and will have a detailed response ready within 2 hours. In the meantime, is there anything specific you'd like me to prioritize?`;
}

export async function listConversations(params?: { search?: string }) {
  const where: any = {};
  if (params?.search) {
    const q = params.search;
    where.OR = [
      { messages: { contains: q, mode: "insensitive" } },
      { aiSummary: { contains: q, mode: "insensitive" } },
      { customer: { name: { contains: q, mode: "insensitive" } } },
      { customer: { email: { contains: q, mode: "insensitive" } } },
      { customer: { phone: { contains: q, mode: "insensitive" } } },
    ];
  }

  const conversations = await prisma.conversation.findMany({
    where,
    include: { customer: { select: { id: true, name: true, email: true, phone: true } } },
    orderBy: { updatedAt: "desc" },
  });
  return conversations.map(parseConversation);
}

export async function getConversationById(id: string) {
  const conversation = await prisma.conversation.findUnique({
    where: { id },
    include: { customer: { select: { id: true, name: true, email: true, phone: true } } },
  });
  return parseConversation(conversation);
}

export async function createConversation(payload: ConversationPayload) {
  if (!payload.customerId || !payload.messages?.length) {
    throw new ApiError(400, "customerId and at least one message are required.");
  }

  const messagesWithTimestamps = payload.messages.map((m) => ({
    ...m,
    timestamp: new Date().toISOString(),
  }));

  const conversation = await prisma.conversation.create({
    data: {
      customerId: payload.customerId,
      messages: serializeMessages(messagesWithTimestamps),
      aiSummary:
        payload.aiSummary ??
        `Conversation started. ${payload.messages.length} message(s) exchanged.`,
    },
    include: { customer: { select: { id: true, name: true, email: true, phone: true } } },
  });

  return parseConversation(conversation);
}

export async function updateConversation(id: string, payload: ConversationUpdatePayload) {
  const conversation = await prisma.conversation.findUnique({ where: { id } });
  if (!conversation) {
    throw new ApiError(404, "Conversation not found");
  }

  const data: any = {
    aiSummary: payload.aiSummary ?? conversation.aiSummary,
  };

  if (payload.messages) {
    data.messages = serializeMessages(payload.messages);
  }

  const updated = await prisma.conversation.update({
    where: { id },
    data,
    include: { customer: { select: { id: true, name: true, email: true, phone: true } } },
  });

  return parseConversation(updated);
}

export async function addMessageToConversation(
  id: string,
  message: ConversationMessage,
  withAiResponse: boolean
) {
  const conversation = await prisma.conversation.findUnique({
    where: { id },
    include: { customer: { select: { id: true, name: true, phone: true } } },
  });
  if (!conversation) {
    throw new ApiError(404, "Conversation not found");
  }

  const existing: ConversationMessage[] =
    typeof conversation.messages === "string"
      ? JSON.parse(conversation.messages)
      : (conversation.messages as ConversationMessage[]);

  const newMessage = { ...message, timestamp: new Date().toISOString() };
  const updatedMessages = [...existing, newMessage];

  if (withAiResponse && message.from !== "agent") {
    const aiText = generateAiResponse(updatedMessages, conversation.customer?.name ?? "there");
    updatedMessages.push({
      from: "agent",
      text: aiText,
      timestamp: new Date().toISOString(),
    });
  }

  const lastUserMsg = [...updatedMessages].reverse().find((m) => m.from === "customer");
  const aiSummary = lastUserMsg
    ? `Latest: "${lastUserMsg.text.slice(0, 80)}${lastUserMsg.text.length > 80 ? "…" : ""}"`
    : conversation.aiSummary;

  const updated = await prisma.conversation.update({
    where: { id },
    data: {
      messages: serializeMessages(updatedMessages),
      aiSummary,
    },
    include: { customer: { select: { id: true, name: true, email: true, phone: true } } },
  });

  // If the agent replied from the CRM Messages UI, sync back to WhatsApp
  if (message.from === "agent" && updated.customer?.phone) {
    try {
      const { sendWhatsAppMessage } = await import("../whatsapp/whatsapp.service.js");
      await sendWhatsAppMessage(updated.customer.phone, message.text);
    } catch (wsError) {
      console.error("[WhatsApp Outbound Sync Error]", wsError);
    }
  }

  // Broadcast update via Socket.IO for real-time CRM updates
  try {
    const { broadcastConversationUpdate } = await import("../../socket.js");
    broadcastConversationUpdate(updated.id, updated.customerId);
  } catch (socketError) {
    console.error("[Socket.IO Broadcast Error]", socketError);
  }

  return parseConversation(updated);
}

export async function deleteConversation(id: string) {
  const conversation = await prisma.conversation.findUnique({ where: { id } });
  if (!conversation) {
    throw new ApiError(404, "Conversation not found");
  }
  await prisma.conversation.delete({ where: { id } });
}
