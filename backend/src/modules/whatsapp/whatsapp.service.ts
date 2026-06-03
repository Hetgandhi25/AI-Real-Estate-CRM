import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  WASocket,
} from "@whiskeysockets/baileys";
// @ts-ignore
import qrcode from "qrcode-terminal";
import { env } from "../../config/env.js";
import { broadcastConversationUpdate } from "../../socket.js";
import { runOpenClawAgent } from "./openclaw.agent.js";
import { prisma } from "../../prisma/index.js";

let sock: WASocket | null = null;
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
 * Starts the Baileys WhatsApp Socket client and handles events.
 */
export async function startWhatsApp() {
  console.log(`[WhatsApp Service] Initializing Baileys auth in folder: ${env.WHATSAPP_SESSION_DIR}`);
  
  const { state, saveCreds } = await useMultiFileAuthState(env.WHATSAPP_SESSION_DIR);

  sock = makeWASocket({
    auth: state,
    printQRInTerminal: false,
  });

  sock.ev.on("creds.update", saveCreds);

  // Connection Updates
  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log("\n📷 SCAN THIS QR CODE ON WHATSAPP TO LINK:");
      qrcode.generate(qr, { small: true });
    }

    if (connection === "open") {
      console.log("✅ WhatsApp successfully connected and ready!");
    }

    if (connection === "close") {
      const shouldReconnect =
        (lastDisconnect?.error as any)?.output?.statusCode !== DisconnectReason.loggedOut;

      console.log(`⚠️ WhatsApp connection closed. Reconnecting: ${shouldReconnect}`);
      if (shouldReconnect) {
        startWhatsApp();
      }
    }
  });

  // Message Events
  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return;

    const msg = messages[0];
    if (!msg || !msg.message) return;

    const sender = msg.key.remoteJid;
    if (!sender) return;

    // Deduplicate messages
    const messageId = msg.key.id;
    if (!messageId || processedMessages.has(messageId)) return;
    processedMessages.add(messageId);
    setTimeout(() => processedMessages.delete(messageId), 60000);

    // Skip self-sent messages
    if (msg.key.fromMe) return;

    // Extract text content
    let messageContent: any = msg.message;
    if (messageContent?.ephemeralMessage) {
      messageContent = messageContent.ephemeralMessage.message;
    }
    if (messageContent?.viewOnceMessage) {
      messageContent = messageContent.viewOnceMessage.message;
    }

    let text =
      messageContent?.conversation ||
      messageContent?.extendedTextMessage?.text ||
      messageContent?.imageMessage?.caption ||
      messageContent?.videoMessage?.caption ||
      "";

    text = text.trim();
    if (!text) return;

    // Truncate incoming text to 1000 characters to prevent buffer bloating DoS
    if (text.length > 1000) {
      text = text.substring(0, 1000) + "... [truncated]";
    }

    const phone = sender.split("@")[0];
    
    // Check WhatsApp rate limiting to prevent spamming DoS attacks
    if (!checkWhatsAppRateLimit(phone)) {
      console.warn(`[WhatsApp Service] Rate limit exceeded for ${phone}. Ignoring message.`);
      return;
    }

    console.log(`💬 Incoming WhatsApp message from ${sender}: "${text}"`);

    const pushName = msg.pushName || undefined;

    try {
      // Execute the OpenClaw agent runtime
      const reply = await runOpenClawAgent({
        phone,
        pushName,
        userMessage: text,
      });

      // Send the response back via WhatsApp
      await sock!.sendMessage(sender, { text: reply });
      console.log(`📤 Sent WhatsApp reply to ${sender}: "${reply}"`);

      // Trigger socket broadcast to update the CRM frontend dashboard in real-time
      const cleanPhone = phone.replace(/[^0-9]/g, "");
      const last10 = cleanPhone.length >= 10 ? cleanPhone.slice(-10) : cleanPhone;
      const customer = await prisma.customer.findFirst({
        where: { phone: { endsWith: last10 } },
        include: { conversations: true },
      });

      if (customer && customer.conversations.length > 0) {
        broadcastConversationUpdate(customer.conversations[0].id, customer.id);
      }
    } catch (err: any) {
      console.error("[WhatsApp Service Error]", err);
      const errMsg = "⚠️ *Server Error*\n\nUnable to process your request right now. Please try again in a moment.";
      await sock!.sendMessage(sender, { text: errMsg });
    }
  });
}

/**
 * Public method to send outbound messages from CRM UI.
 */
export async function sendWhatsAppMessage(phone: string, text: string): Promise<boolean> {
  if (!sock) {
    console.error("[WhatsApp Service] Cannot send outbound WhatsApp message: Baileys socket is not connected!");
    return false;
  }

  try {
    const cleanPhone = phone.replace(/[^0-9]/g, "");
    const jid = cleanPhone.includes("@s.whatsapp.net") ? cleanPhone : `${cleanPhone}@s.whatsapp.net`;
    
    console.log(`[WhatsApp Service] Sending outbound message to ${jid}`);
    await sock.sendMessage(jid, { text });
    return true;
  } catch (error) {
    console.error("[WhatsApp Service] Failed to send outbound WhatsApp message:", error);
    return false;
  }
}
