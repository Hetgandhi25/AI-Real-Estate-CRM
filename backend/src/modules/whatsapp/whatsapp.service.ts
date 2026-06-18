import { env } from "../../config/env.js";
import { broadcastConversationUpdate } from "../../socket.js";
import { runOpenClawAgent } from "./openclaw.agent.js";
import { prisma } from "../../prisma/index.js";
import { normalizePhone } from "../../common/lib/phone.utils.js";

const processedMessages = new Set<string>();

const whatsappLimiterMap = new Map<string, { count: number; resetTime: number }>();
const WHATSAPP_LIMIT = 5; // Max 5 messages
const WHATSAPP_WINDOW_MS = 10 * 1000; // per 10 seconds

// Periodic cleanup of whatsappLimiterMap to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [phone, record] of whatsappLimiterMap.entries()) {
    if (now > record.resetTime) {
      whatsappLimiterMap.delete(phone);
    }
  }
}, 5 * 60 * 1000).unref();

function checkWhatsAppRateLimit(phone: string): boolean {
  const now = Date.now();
  const record = whatsappLimiterMap.get(phone);
  
  if (!record || now > record.resetTime) {
    whatsappLimiterMap.set(phone, {
      count: 1,
      resetTime: now + WHATSAPP_WINDOW_MS,
    });
    return true;
  }
  
  record.count += 1;
  return record.count <= WHATSAPP_LIMIT;
}

/**
 * Sends an outbound WhatsApp message via Meta Cloud API.
 * Returns the wamid (Meta Message ID) if successful.
 */
export async function sendWhatsAppMessage(phone: string, text: string): Promise<{ success: boolean; wamid?: string; error?: string }> {
  try {
    const cleanPhone = normalizePhone(phone);
    
    console.log(`[WhatsApp Service] Sending outbound message to ${cleanPhone}`);
    
    const url = `https://graph.facebook.com/v19.0/${env.META_WA_PHONE_NUMBER_ID}/messages`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.META_WA_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: cleanPhone,
        type: "text",
        text: { preview_url: false, body: text },
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("[WhatsApp Service] Failed to send outbound WhatsApp message:", response.status, errorData);
      return { success: false, error: errorData };
    }

    const responseData: any = await response.json();
    const wamid = responseData.messages?.[0]?.id;

    return { success: true, wamid };
  } catch (error: any) {
    console.error("[WhatsApp Service] Exception sending outbound WhatsApp message:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Handles incoming WhatsApp messages from Meta Webhook payload.
 */
export async function handleIncomingMessage(body: any) {
  try {
    if (body.object !== "whatsapp_business_account") return;

    for (const entry of body.entry) {
      for (const change of entry.changes) {
        const value = change.value;
        if (value && value.messages && value.messages[0]) {
          const msg = value.messages[0];
          const contact = value.contacts && value.contacts[0] ? value.contacts[0] : null;

          const sender = msg.from; // Phone number without '+'
          const messageId = msg.id;

          if (!sender || !messageId) continue;

          // Deduplicate messages
          if (processedMessages.has(messageId)) continue;
          processedMessages.add(messageId);
          setTimeout(() => processedMessages.delete(messageId), 60000);

          let text = "";
          if (msg.type === "text") {
            text = msg.text.body;
          } else if (msg.type === "button") {
            text = msg.button.text;
          } else if (msg.type === "interactive") {
            text = msg.interactive.button_reply?.title || msg.interactive.list_reply?.title || "";
          }

          text = text.trim();
          if (!text) continue;

          // Truncate incoming text to 1000 characters to prevent buffer bloating DoS
          if (text.length > 1000) {
            text = text.substring(0, 1000) + "... [truncated]";
          }

          const phone = sender;
          
          // Check WhatsApp rate limiting to prevent spamming DoS attacks
          if (!checkWhatsAppRateLimit(phone)) {
            console.warn(`[WhatsApp Service] Rate limit exceeded for ${phone}. Ignoring message.`);
            continue;
          }

          console.log(`💬 Incoming WhatsApp message from ${sender}: "${text}"`);

          const pushName = contact?.profile?.name || undefined;

          try {
            // Execute the OpenClaw agent runtime
            const reply = await runOpenClawAgent({
              phone,
              pushName,
              userMessage: text,
            });

            // Send the response back via WhatsApp
            await sendWhatsAppMessage(phone, reply);
            console.log(`📤 Sent WhatsApp reply to ${sender}: "${reply}"`);

            // Trigger socket broadcast to update the CRM frontend dashboard in real-time
            const normalizedPhone = normalizePhone(phone);
            const customer = await prisma.customer.findFirst({
              where: { phone: normalizedPhone },
              include: { conversations: true },
            });

            if (customer && customer.conversations.length > 0) {
              broadcastConversationUpdate(customer.conversations[0].id, customer.id);
            }
          } catch (err: any) {
            console.error("[WhatsApp Service Error]", err);
            const errMsg = "⚠️ *Server Error*\n\nUnable to process your request right now. Please try again in a moment.";
            await sendWhatsAppMessage(phone, errMsg);
          }
        }
      }
    }
  } catch (error) {
    console.error("[WhatsApp Service] Error processing incoming webhook:", error);
  }
}
