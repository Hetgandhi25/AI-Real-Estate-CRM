import { prisma } from "../../prisma/index.js";
import { ApiError } from "../../common/lib/api-error.js";

type ConversationMessage = { from: string; text: string; timestamp?: string };

type ConversationPayload = {
  customerId: string;
  messages: ConversationMessage[];
  aiSummary?: string;
};

type ConversationUpdatePayload = Partial<ConversationPayload>;

async function resolveMessagesPhaseA(conversation: any) {
  if (!conversation) return conversation;
  
  let resolvedMessages: ConversationMessage[] = [];
  
  // 1. Try reading from messagesList (SQL table)
  if (conversation.messagesList && conversation.messagesList.length > 0) {
    resolvedMessages = conversation.messagesList.map((m: any) => ({
      from: m.from,
      text: m.text,
      timestamp: m.timestamp.toISOString()
    })).sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  } else {
    // 2. Fallback to Conversation.messages JSON
    try {
      resolvedMessages = typeof conversation.messages === "string" 
        ? JSON.parse(conversation.messages) 
        : conversation.messages;
    } catch (e) {
      resolvedMessages = [];
    }
    
    if (!Array.isArray(resolvedMessages)) resolvedMessages = [];
    
    // 3. Self-heal missing Message rows
    if (resolvedMessages.length > 0) {
      try {
        const createData = resolvedMessages.map((m) => ({
          conversationId: conversation.id,
          from: m.from,
          text: m.text,
          timestamp: m.timestamp ? new Date(m.timestamp) : new Date()
        }));
        await prisma.message.createMany({
          data: createData,
          skipDuplicates: true
        });
      } catch (err) {
        console.error("[Conversation Service] Self-heal failed", err);
      }
    }
  }

  return {
    ...conversation,
    messages: resolvedMessages,
    messagesList: undefined
  };
}

function serializeMessages(messages: ConversationMessage[]) {
  return JSON.stringify(messages);
}

/** Generate a response by calling the real OpenClaw agent runtime asynchronously */
async function generateAiResponse(messages: ConversationMessage[], phone: string, customerName: string): Promise<string> {
  const lastCustomerMsg = [...messages].reverse().find((m) => m.from === "customer");
  const text = lastCustomerMsg?.text ?? "";

  try {
    const { runOpenClawAgent } = await import("../whatsapp/openclaw.agent.js");
    const reply = await runOpenClawAgent({
      phone: phone || "simulation",
      pushName: customerName,
      userMessage: text,
    });
    return reply;
  } catch (error: any) {
    console.error("[Conversation Service] AI Agent execution failed, using fallback.", error.message);
    
    // Heuristic fallback if Ollama is offline
    if (text.includes("tour") || text.includes("visit") || text.includes("view")) {
      return `Hi ${customerName}! I can schedule a property tour for you. Our agents are available Monday–Saturday, 9 AM–6 PM. Would you prefer a morning or afternoon slot?`;
    }
    if (text.includes("price") || text.includes("cost") || text.includes("budget")) {
      return `Great question! Based on your budget and preferences, I've identified 3 properties that match your criteria. I'll send you a detailed comparison report shortly.`;
    }
    return `Thank you for reaching out, ${customerName}! The AI Bot is currently busy, but an agent has been notified and will reply shortly.`;
  }
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
    include: { 
      customer: { select: { id: true, name: true, email: true, phone: true } },
      messagesList: true 
    },
    orderBy: { updatedAt: "desc" },
  });
  return Promise.all(conversations.map(resolveMessagesPhaseA));
}

export async function getConversationById(id: string) {
  const conversation = await prisma.conversation.findUnique({
    where: { id },
    include: { 
      customer: { select: { id: true, name: true, email: true, phone: true } },
      messagesList: true
    },
  });
  return resolveMessagesPhaseA(conversation);
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

  // Save individual message records to SQL Message table for granular analytics
  for (const msg of messagesWithTimestamps) {
    try {
      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          from: msg.from,
          text: msg.text,
          timestamp: new Date(msg.timestamp),
        },
      });
    } catch (msgErr) {
      console.error("[Conversation Service] Failed to create message record", msgErr);
    }
  }

  return resolveMessagesPhaseA(conversation);
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

  return resolveMessagesPhaseA(updated);
}

export async function addMessageToConversation(
  id: string,
  message: ConversationMessage,
  withAiResponse: boolean
) {
  {
    const conversation = await prisma.conversation.findUnique({
      where: { id },
      include: { 
        customer: { select: { id: true, name: true, phone: true } },
        messagesList: true
      },
    });
    if (!conversation) {
      throw new ApiError(404, "Conversation not found");
    }

    const resolvedConversation = await resolveMessagesPhaseA(conversation);
    const existing: ConversationMessage[] = resolvedConversation.messages;

    const newMessage = { ...message, timestamp: new Date().toISOString() };
    const updatedMessages = [...existing, newMessage];

    if (withAiResponse && message.from !== "agent") {
      const aiText = await generateAiResponse(
        updatedMessages,
        conversation.customer?.phone || "simulation",
        conversation.customer?.name ?? "there"
      );
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

    // Save individual message records to SQL Message table for granular analytics if manually added
    if (!withAiResponse) {
      try {
        await prisma.message.create({
          data: {
            conversationId: updated.id,
            from: message.from,
            text: message.text,
            timestamp: new Date(newMessage.timestamp),
          },
        });
      } catch (msgErr) {
        console.error("[Conversation Service] Failed to create manual message record", msgErr);
      }
    }

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

    return resolveMessagesPhaseA(updated);
  }
}

export async function deleteConversation(id: string) {
  const conversation = await prisma.conversation.findUnique({ where: { id } });
  if (!conversation) {
    throw new ApiError(404, "Conversation not found");
  }
  await prisma.conversation.delete({ where: { id } });
}
