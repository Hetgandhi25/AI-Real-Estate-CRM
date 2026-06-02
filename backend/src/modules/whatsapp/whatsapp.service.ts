import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  WASocket
} from "@whiskeysockets/baileys";
// @ts-ignore
import qrcode from "qrcode-terminal";
import { prisma } from "../../prisma/index.js";
import { searchInventoryByFilters } from "./postgresql.tool.js";
import { store } from "./session.store.js";
import { SYSTEM_PROMPT } from "./prompts/system-prompt.js";
import { env } from "../../config/env.js";
import { broadcastConversationUpdate } from "../../socket.js";
import axios from "axios";

let sock: WASocket | null = null;
const processedMessages = new Set<string>();

const GREETING_PATTERNS = [
  /^hi\b/i,
  /^hello\b/i,
  /^hey\b/i,
  /^hii+\b/i,
  /^good\s+(morning|evening|afternoon|night)\b/i,
  /^namaste\b/i,
  /^kem\s+cho\b/i
];

const RESET_PATTERNS = [
  /^reset\b/i,
  /^start\s+over\b/i,
  /^new\s+search\b/i,
  /^clear\b/i,
  /^cancel\b/i,
  /^restart\b/i
];

const PROPERTY_SIGNAL_WORDS = [
  "flat", "apartment", "villa", "house", "plot", "land", "bhk",
  "bedroom", "lakh", "crore", "search", "find", "buy", "invest",
  "gota", "ahmedabad", "bopal", "satellite", "under", "above",
  "between", "budget", "surat", "mumbai", "pune", "delhi"
];

const WELCOME_MESSAGE =
`👋 *Hello! Welcome to PropertyBot*

🏠 I can help you find properties from our inventory.

*Try queries like:*
• 2 BHK flat in Gota below 50 lakh
• Villa in Ahmedabad above 1 crore
• 3 BHK apartment in Satellite
• Plot above 40 lakh for investment

✨ What are you looking for?`;

function isGreeting(text: string): boolean {
  const normalized = text.trim().toLowerCase();
  return GREETING_PATTERNS.some(p => p.test(normalized));
}

function isResetCommand(text: string): boolean {
  return RESET_PATTERNS.some(p => p.test(text.trim()));
}

function isPropertyQuery(text: string): boolean {
  const lower = text.toLowerCase();
  return PROPERTY_SIGNAL_WORDS.some(word => lower.includes(word));
}

function buildConfirmation(session: any): string {
  const c = session.collected;
  const lines = ["🔍 *Searching our inventory...*\n"];

  if (c.type) {
    lines.push(`🏢 Type: ${c.type}`);
  }

  if (c.location && typeof c.location === "string" && c.location.trim().length > 0) {
    lines.push(`📍 Location: ${c.location}`);
  }

  if (c.bedrooms) {
    lines.push(`🛏️ BHK: ${c.bedrooms} BHK`);
  }

  if (c.budget) {
    const b = c.budget;
    if (b.maxPrice !== null && b.minPrice !== null) {
      lines.push(`💰 Budget: ₹${Math.round(b.minPrice)}–${Math.round(b.maxPrice)} Lakh`);
    } else if (b.maxPrice !== null) {
      lines.push(`💰 Budget: below ₹${Math.round(b.maxPrice)} Lakh`);
    } else if (b.minPrice !== null) {
      lines.push(`💰 Budget: above ₹${Math.round(b.minPrice)} Lakh`);
    }
  } else {
    lines.push("💰 Budget: any");
  }

  lines.push("\n_One moment please..._");
  return lines.join("\n");
}

async function callLLM(inventory: any[], userQuery: string): Promise<string> {
  const inventoryContext = inventory.length > 0
    ? `RETRIEVED INVENTORY RESULTS (already filtered — present these exactly):\n${JSON.stringify(inventory, null, 2)}`
    : `RETRIEVED INVENTORY RESULTS: none\n\nThis is a conversational message, not a property search query. Respond naturally as a helpful property assistant.`;

  const userMessage = `${inventoryContext}\n\nUSER MESSAGE: ${userQuery}`;
  console.log(`[callLLM] Calling Ollama (${env.OLLAMA_MODEL}) | inventory rows: ${inventory.length}`);

  try {
    const response = await axios.post(`${env.OLLAMA_BASE_URL}/api/chat`, {
      model: env.OLLAMA_MODEL,
      stream: false,
      options: {
        temperature: 0.3,
        top_p: 0.9,
        num_predict: 512
      },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMessage }
      ]
    }, {
      timeout: 15000 // 15s timeout
    });

    const reply = response.data?.message?.content?.trim();
    if (!reply) {
      throw new Error("Empty LLM response");
    }
    return reply;
  } catch (error: any) {
    console.error("[callLLM] Ollama connection failed, falling back to local heuristic response.", error.message);
    
    // Simple robust fallback if Ollama is not running locally/connected
    if (inventory.length > 0) {
      const p = inventory[0];
      return `🏠 *Property Found:* ${p.title} at *${p.address || p.city}*.\n💰 *Price:* ₹${p.price / 100000} Lakh\n🛏️ *BHK:* ${p.bhk} BHK\n📐 *Area:* ${p.area}\n\nWould you like to schedule a tour or need more details?`;
    }
    return "Thank you for reaching out! I've received your request and will connect you with a property agent shortly. Can I help you with anything else?";
  }
}

// ─────────────────────────────────────────────────────────────
// SAVE TO DATABASE HELPER
// ─────────────────────────────────────────────────────────────
async function saveMessageToDb(
  phone: string,
  pushName: string | null | undefined,
  messageText: string,
  from: "customer" | "agent"
): Promise<{ conversationId: string; customerId: string }> {
  // 1. Get or Create Customer
  let customer = await prisma.customer.findFirst({
    where: { phone: { contains: phone } }
  });

  if (!customer) {
    // Generate clean unique email
    const cleanEmail = `${phone.replace(/[^0-9]/g, "")}@whatsapp.yandox.com`;
    customer = await prisma.customer.create({
      data: {
        name: pushName || `WhatsApp User ${phone}`,
        phone: phone,
        email: cleanEmail,
        notes: "Created automatically via WhatsApp bot."
      }
    });
    console.log(`[WhatsApp Service] Created new customer: ${customer.name}`);
  }

  // 2. Get or Create Conversation
  let conversation = await prisma.conversation.findFirst({
    where: { customerId: customer.id }
  });

  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: {
        customerId: customer.id,
        messages: JSON.stringify([]),
        aiSummary: "Conversation started via WhatsApp."
      }
    });
    console.log(`[WhatsApp Service] Created new conversation for customer: ${customer.name}`);
  }

  // 3. Append Message
  const messages: any[] = JSON.parse(conversation.messages);
  messages.push({
    from,
    text: messageText,
    timestamp: new Date().toISOString()
  });

  // Calculate new AI summary if customer message
  let aiSummary = conversation.aiSummary;
  if (from === "customer") {
    aiSummary = `Latest: "${messageText.slice(0, 80)}${messageText.length > 80 ? "..." : ""}"`;
  }

  await prisma.conversation.update({
    where: { id: conversation.id },
    data: {
      messages: JSON.stringify(messages),
      aiSummary
    }
  });

  // 4. Broadcast via Socket.IO
  broadcastConversationUpdate(conversation.id, customer.id);

  return { conversationId: conversation.id, customerId: customer.id };
}

// ─────────────────────────────────────────────────────────────
// AD LEAD DETECTION AND FINALIZATION HELPERS
// ─────────────────────────────────────────────────────────────
function detectAdLeadSource(text: string): "Facebook Ad" | "Instagram Ad" | "Meta Ad" | null {
  const lower = text.toLowerCase();
  
  if (
    lower.includes("instagram ad") || 
    lower.includes("instagram_ad") ||
    lower.includes("ig ad") ||
    lower.includes("ig_ad") ||
    (lower.includes("instagram") && (lower.includes("ad") || lower.includes("saw") || lower.includes("click")))
  ) {
    return "Instagram Ad";
  }
  
  if (
    lower.includes("facebook ad") || 
    lower.includes("facebook_ad") ||
    lower.includes("fb ad") ||
    lower.includes("fb_ad") ||
    (lower.includes("facebook") && (lower.includes("ad") || lower.includes("saw") || lower.includes("click"))) ||
    (lower.includes("fb") && (lower.includes("ad") || lower.includes("saw") || lower.includes("click")))
  ) {
    return "Facebook Ad";
  }
  
  if (
    lower.includes("meta ad") || 
    lower.includes("meta_ad") ||
    (lower.includes("meta") && (lower.includes("ad") || lower.includes("saw") || lower.includes("click")))
  ) {
    return "Meta Ad";
  }
  
  return null;
}

async function finalizeAdLead(session: any, phone: string, pushName: string | null | undefined) {
  // 1. Get or Create Customer
  let customer = await prisma.customer.findFirst({
    where: { phone: { contains: phone } }
  });

  const budgetVal = session.collected.budget 
    ? (session.collected.budget.maxPrice 
        ? session.collected.budget.maxPrice * 100000 
        : (session.collected.budget.minPrice 
            ? session.collected.budget.minPrice * 100000 
            : null))
    : null;

  const name = session.collected.ad_name || pushName || `WhatsApp User ${phone}`;
  const location = session.collected.location || null;
  const buyRent = session.collected.buyRent || "Buy";
  const preferences = session.collected.preferences || "None";
  const bedrooms = session.collected.bedrooms || null;

  const notes = `Ad Lead from ${session.adSource}. BHK: ${bedrooms ? bedrooms + ' BHK' : 'any'}, Buy/Rent: ${buyRent}, Preferences: ${preferences}.`;

  if (customer) {
    customer = await prisma.customer.update({
      where: { id: customer.id },
      data: {
        name: name,
        preferredLocation: location,
        budget: budgetVal,
        notes: notes
      }
    });
    console.log(`[WhatsApp Service] Updated customer: ${customer.name}`);
  } else {
    const cleanEmail = `${phone.replace(/[^0-9]/g, "")}@whatsapp.yandox.com`;
    customer = await prisma.customer.create({
      data: {
        name: name,
        phone: phone,
        email: cleanEmail,
        preferredLocation: location,
        budget: budgetVal,
        notes: notes
      }
    });
    console.log(`[WhatsApp Service] Created new customer: ${customer.name}`);
  }

  // 2. Find a matching property to link the Lead to
  const filters = session.buildFilters();
  const inventory = await searchInventoryByFilters(filters);
  let propertyId: string | null = null;
  if (inventory.length > 0) {
    propertyId = inventory[0].id;
  } else {
    const fallbackProp = await prisma.property.findFirst({
      where: { status: "FOR_SALE" }
    }) || await prisma.property.findFirst();
    if (fallbackProp) {
      propertyId = fallbackProp.id;
    }
  }

  if (!propertyId) {
    throw new Error("No properties found in database to link the lead.");
  }

  // 3. Create the Lead
  const lead = await prisma.lead.create({
    data: {
      customerId: customer.id,
      propertyId: propertyId,
      status: "NEW",
      source: session.adSource || "Meta Ad",
      notes: `Requirements: Location: ${location}, Type: ${session.collected.type}, Budget: ${session.collected.budget ? session.buildSearchLabel() : 'any'}, Buy/Rent: ${buyRent}, BHK: ${bedrooms}, Preferences: ${preferences}.`
    }
  });
  console.log(`[WhatsApp Service] Created lead ${lead.id} for customer ${customer.name}`);

  return { leadId: lead.id, customerId: customer.id };
}

// ─────────────────────────────────────────────────────────────
// BOT RESPONSE RUNNER
// ─────────────────────────────────────────────────────────────
async function runSearch(session: any, sender: string, phone: string, pushName: string | null | undefined, queryHint?: string) {
  const confirmation = buildConfirmation(session);
  
  // Send confirmation card on WhatsApp
  await sock!.sendMessage(sender, { text: confirmation });
  // Save confirmation to DB
  await saveMessageToDb(phone, pushName, confirmation, "agent");

  const filters = session.buildFilters();
  const searchLabel = session.buildSearchLabel();
  const labelForLlm = queryHint ? `${searchLabel} | User instruction: ${queryHint}` : searchLabel;

  console.log(`[runSearch] Querying database with filters:`, JSON.stringify(filters, null, 2));
  const inventory = await searchInventoryByFilters(filters);
  console.log(`[runSearch] Matches found: ${inventory.length}`);

  // Keep filters in session for persistent memory, but mark inactive
  session.pendingField = null;
  session.active = false;

  const reply = await callLLM(inventory, labelForLlm);
  
  // Send LLM generated reply
  await sock!.sendMessage(sender, { text: reply });
  // Save reply to DB
  await saveMessageToDb(phone, pushName, reply, "agent");
}

// ─────────────────────────────────────────────────────────────
// START WHATSAPP CONNECTION
// ─────────────────────────────────────────────────────────────
export async function startWhatsApp() {
  console.log(`[WhatsApp Service] Initializing Baileys in folder: ${env.WHATSAPP_SESSION_DIR}`);
  
  const { state, saveCreds } = await useMultiFileAuthState(env.WHATSAPP_SESSION_DIR);

  sock = makeWASocket({
    auth: state,
    printQRInTerminal: false
  });

  sock.ev.on("creds.update", saveCreds);

  // Connection State Updates
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

    // Deduplicate
    const messageId = msg.key.id;
    if (!messageId || processedMessages.has(messageId)) return;
    processedMessages.add(messageId);
    setTimeout(() => processedMessages.delete(messageId), 60000);

    // Skip self-messages
    if (msg.key.fromMe) return;

    // Get text content
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

    console.log(`💬 Incoming message from ${sender}: "${text}"`);

    const phone = sender.split("@")[0];
    const pushName = msg.pushName;

    // 1. Save incoming message to database
    await saveMessageToDb(phone, pushName, text, "customer");

    const session = store.get(sender);

    // 2. Click-to-WhatsApp Ad Lead Detection
    const adSource = detectAdLeadSource(text);
    if (adSource && !session.isAdLead) {
      console.log(`[Router] Routing to Ad Lead flow for source: ${adSource}`);
      session.reset();
      session.isAdLead = true;
      session.adSource = adSource;
      session.active = true;

      // Welcome message and first details prompt
      const adWelcome = `👋 *Welcome! Thanks for clicking our ${adSource}!* 🏠\n\nI'll help you find properties in our inventory. Let's collect a few details to get started.`;
      await sock!.sendMessage(sender, { text: adWelcome });
      await saveMessageToDb(phone, pushName, adWelcome, "agent");

      // Ingest any requirements from initial query
      const prefilled = session.ingestInitialQuery(text);
      console.log(`[Router] Ad initial text parsed. Prefilled fields:`, prefilled);

      const next = session.nextQuestion();
      if (next) {
        await sock!.sendMessage(sender, { text: next.question });
        await saveMessageToDb(phone, pushName, next.question, "agent");
      }
      return;
    }

    // 3. Ad Lead Conversation Active Slot-Filling
    if (session.isAdLead) {
      try {
        if (session.pendingField) {
          const oldPending = session.pendingField;
          console.log(`[Ad Router] Ingesting into active Ad session: field=${oldPending}`);
          const result = session.ingest(text);

          if (result === "invalid") {
            const displayField = oldPending === "ad_name" ? "name" : oldPending === "buyRent" ? "Buy or Rent preference" : oldPending;
            const invalidMsg = `⚠️ Please provide a valid ${displayField}`;
            await sock!.sendMessage(sender, { text: invalidMsg });
            await saveMessageToDb(phone, pushName, invalidMsg, "agent");
            return;
          }
        }

        const next = session.nextQuestion();
        if (next) {
          await sock!.sendMessage(sender, { text: next.question });
          await saveMessageToDb(phone, pushName, next.question, "agent");
        } else {
          // All fields collected! Process the lead!
          console.log(`[Ad Router] All fields collected! Finalizing customer and lead...`);
          
          await finalizeAdLead(session, phone, pushName);
          
          const thankYouName = session.collected.ad_name || "there";
          const thankYou = `✨ *Thank you, ${thankYouName}!* I've saved your details and registered you as a lead in our CRM.\n\nNow searching our inventory for properties matching your requirements...`;
          await sock!.sendMessage(sender, { text: thankYou });
          await saveMessageToDb(phone, pushName, thankYou, "agent");

          session.isAdLead = false;
          await runSearch(session, sender, phone, pushName, text);
        }
      } catch (err: any) {
        console.error("[Ad Router Error]", err);
        const errMsg = "⚠️ *Error processing your information.*\n\nPlease try again in a moment.";
        await sock!.sendMessage(sender, { text: errMsg });
        await saveMessageToDb(phone, pushName, errMsg, "agent");
      }
      return;
    }

    // 4. Greeting Routing
    if (isGreeting(text)) {
      console.log(`[Router] Routing to greeting flow.`);
      session.reset();
      await sock!.sendMessage(sender, { text: WELCOME_MESSAGE });
      await saveMessageToDb(phone, pushName, WELCOME_MESSAGE, "agent");
      return;
    }

    // 5. Reset Routing
    if (isResetCommand(text)) {
      console.log(`[Router] Routing to reset flow.`);
      session.reset();
      const resetMsg = "🔄 *Search reset!*\n\nWhat are you looking for now?";
      await sock!.sendMessage(sender, { text: resetMsg });
      await saveMessageToDb(phone, pushName, resetMsg, "agent");
      return;
    }

    try {
      // Ingest filters from the message (increments existing ones)
      const filledFields = session.ingestInitialQuery(text);
      console.log(`[Router] Filled fields from text:`, filledFields, `Collected so far:`, JSON.stringify(session.collected));

      // 4. If required fields (type and location) are filled
      if (session.hasRequiredFields()) {
        const searchSignals = ["show", "more", "best", "option", "search", "find", "give", "send", "only", "near", "with", "furnished", "appreciation", "invest"];
        const isSearchSignal = searchSignals.some(s => text.toLowerCase().includes(s)) ||
                               isPropertyQuery(text);
        
        const wasPending = !!session.pendingField;

        // Run search if they want options, sent a property query, or if we were not pending
        if (session.isReadyToSearch() || isSearchSignal || !wasPending) {
          await runSearch(session, sender, phone, pushName, text);
          return;
        }
      }

      // 5. Guided Slot-Filling Flow
      if (session.active && session.pendingField) {
        const oldPending = session.pendingField;
        console.log(`[Router] Ingesting into active session: field=${oldPending}`);
        const result = session.ingest(text);

        if (result === "invalid") {
          // If they updated some OTHER field, don't throw error, just prompt again
          if (filledFields.length > 0) {
            const next = session.nextQuestion();
            if (next) {
              await sock!.sendMessage(sender, { text: next.question });
              await saveMessageToDb(phone, pushName, next.question, "agent");
            }
            return;
          }

          const invalidMsg = `⚠️ Please provide a valid property ${oldPending}`;
          await sock!.sendMessage(sender, { text: invalidMsg });
          await saveMessageToDb(phone, pushName, invalidMsg, "agent");
          return;
        }

        if (session.hasRequiredFields()) {
          await runSearch(session, sender, phone, pushName, text);
        } else {
          const next = session.nextQuestion();
          if (next) {
            await sock!.sendMessage(sender, { text: next.question });
            await saveMessageToDb(phone, pushName, next.question, "agent");
          }
        }
        return;
      }

      // 6. If they started a new property query but required fields are missing, prompt next question
      if (isPropertyQuery(text)) {
        const next = session.nextQuestion();
        if (next) {
          await sock!.sendMessage(sender, { text: next.question });
          await saveMessageToDb(phone, pushName, next.question, "agent");
        }
        return;
      }

      // 7. Conversational Chat Flow (Fallback)
      console.log(`[Router] Conversational flow fallback.`);
      const reply = await callLLM([], text);
      await sock!.sendMessage(sender, { text: reply });
      await saveMessageToDb(phone, pushName, reply, "agent");

    } catch (err: any) {
      console.error("[WhatsApp Service Error]", err);
      const errMsg = "⚠️ *Server Error*\n\nUnable to process your request right now. Please try again in a moment.";
      await sock!.sendMessage(sender, { text: errMsg });
      await saveMessageToDb(phone, pushName, errMsg, "agent");
    }
  });
}

// ─────────────────────────────────────────────────────────────
// PUBLIC METHOD: OUTBOUND CRM MESSAGES
// ─────────────────────────────────────────────────────────────
export async function sendWhatsAppMessage(phone: string, text: string): Promise<boolean> {
  if (!sock) {
    console.error("[WhatsApp Service] Cannot send outbound WhatsApp message: Baileys socket is not connected!");
    return false;
  }

  try {
    // Strip non-digits to get clean phone number
    const cleanPhone = phone.replace(/[^0-9]/g, "");
    // Ensure JID suffix
    const jid = cleanPhone.includes("@s.whatsapp.net") ? cleanPhone : `${cleanPhone}@s.whatsapp.net`;
    
    console.log(`[WhatsApp Service] Sending outbound message to ${jid}`);
    await sock.sendMessage(jid, { text });
    return true;
  } catch (error) {
    console.error("[WhatsApp Service] Failed to send outbound WhatsApp message:", error);
    return false;
  }
}
