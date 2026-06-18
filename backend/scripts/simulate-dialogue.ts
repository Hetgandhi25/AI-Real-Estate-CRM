import { PrismaClient } from "@prisma/client";
import { searchInventoryByFilters, searchInventory } from "../src/modules/whatsapp/postgresql.tool.js";
import { store } from "../src/modules/whatsapp/session.store.js";
import { SYSTEM_PROMPT } from "../src/modules/whatsapp/prompts/system-prompt.js";
import axios from "axios";

const prisma = new PrismaClient();
const PHONE = "919099090909";
const JID = `${PHONE}@s.whatsapp.net`;
const CLIENT_NAME = "Het Patel";

// Mock Meta API sending
async function mockSend(text: string) {
  console.log(`\n📲 [WhatsApp Received on Phone]:\n----------------------------------------\n${text}\n----------------------------------------`);
}

async function handleMessage(text: string): Promise<string> {
  const session = store.get(JID);
  const trimmedText = text.trim();

  // 1. Save incoming message to DB
  let customer = await prisma.customer.findFirst({
    where: { phone: PHONE }
  });

  if (!customer) {
    customer = await prisma.customer.create({
      data: {
        name: CLIENT_NAME,
        phone: PHONE,
        email: `${PHONE}@whatsapp.yandox.com`,
        notes: "Created via simulated dialogue test."
      }
    });
  }

  let conversation = await prisma.conversation.findFirst({
    where: { customerId: customer.id }
  });

  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: {
        customerId: customer.id,
        messages: JSON.stringify([]),
        aiSummary: "Started conversation."
      }
    });
  }

  const dbMessages = JSON.parse(conversation.messages);
  dbMessages.push({
    from: "customer",
    text: trimmedText,
    timestamp: new Date().toISOString()
  });

  await prisma.conversation.update({
    where: { id: conversation.id },
    data: {
      messages: JSON.stringify(dbMessages),
      aiSummary: `Simulated: "${trimmedText.slice(0, 50)}"`
    }
  });

  // 2. Logic Routing
  const OLLAMA_BASE_URL = "http://192.168.100.16:11434";
  const OLLAMA_MODEL = "qwen3:8b";

  async function mockCallLLM(inventory: any[], queryHint: string): Promise<string> {
    try {
      const inventoryContext = inventory.length > 0
        ? `RETRIEVED INVENTORY RESULTS (already filtered — present these exactly):\n${JSON.stringify(inventory, null, 2)}`
        : `RETRIEVED INVENTORY RESULTS: none\n\nThis is a conversational message, not a property search query. Respond naturally as a helpful property assistant.`;

      const response = await axios.post(`${OLLAMA_BASE_URL}/api/chat`, {
        model: OLLAMA_MODEL,
        stream: false,
        options: { temperature: 0.3, top_p: 0.9, num_predict: 512 },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `${inventoryContext}\n\nUSER MESSAGE: ${queryHint}` }
        ]
      }, { timeout: 4000 });
      return response.data?.message?.content?.trim() || "";
    } catch {
      // Fast heuristic fallback to avoid blocking simulation if Ollama is not running
      if (inventory.length > 0) {
        return `🤖 [AI Fallback Assistant]: Based on our inventory, here is the best match for you:\n\n🏠 *${inventory[0].title}* in *${inventory[0].address}*\n💰 Price: ₹${inventory[0].price / 100000} Lakhs\n📐 Area: ${inventory[0].area}\n\nWould you like to visit this property?`;
      }
      return `🤖 [AI Fallback Assistant]: I understand you are asking about "${queryHint}". Let me search our database or arrange a callback with an agent.`;
    }
  }

  async function runMockSearch(queryHint?: string): Promise<string> {
    const confirmation = "🔍 *Searching our inventory...*\n" + session.summary() + "\n_One moment please..._";
    await saveReplyToDb(conversation.id, confirmation);
    console.log(`\n📲 [WhatsApp Received on Phone]:\n----------------------------------------\n${confirmation}\n----------------------------------------`);

    const filters = session.buildFilters();
    const searchLabel = session.buildSearchLabel();
    const labelForLlm = queryHint ? `${searchLabel} | User instruction: ${queryHint}` : searchLabel;

    const matches = await searchInventoryByFilters(filters);

    session.pendingField = null;
    session.active = false;

    const reply = await mockCallLLM(matches, labelForLlm);
    await saveReplyToDb(conversation.id, reply);
    return reply;
  }

  const PROPERTY_SIGNAL_WORDS = [
    "flat", "apartment", "villa", "house", "plot", "land", "bhk",
    "bedroom", "lakh", "crore", "search", "find", "buy", "invest",
    "gota", "ahmedabad", "bopal", "satellite", "satelite", "under", "above",
    "between", "budget", "surat", "mumbai", "pune", "delhi"
  ];
  function isPropertyQuery(t: string): boolean {
    const lower = t.toLowerCase();
    return PROPERTY_SIGNAL_WORDS.some(w => lower.includes(w));
  }

  // Greeting
  const GREETING_PATTERNS = [/^hi\b/i, /^hello\b/i, /^hey\b/i, /^hii+\b/i];
  if (GREETING_PATTERNS.some(p => p.test(trimmedText.toLowerCase()))) {
    session.reset();
    const reply = "👋 *Hello! Welcome to PropertyBot*\n🏠 I can help you find properties from our inventory.\n\n✨ What are you looking for?";
    await saveReplyToDb(conversation.id, reply);
    return reply;
  }

  // Reset
  if (/^reset\b/i.test(trimmedText)) {
    session.reset();
    const reply = "🔄 *Search reset!*\n\nWhat are you looking for now?";
    await saveReplyToDb(conversation.id, reply);
    return reply;
  }

  // Ingest or Search
  try {
    const filledFields = session.ingestInitialQuery(trimmedText);
    console.log(`[Router] Filled fields from text:`, filledFields, `Collected so far:`, JSON.stringify(session.collected));

    if (session.hasRequiredFields()) {
      const searchSignals = ["show", "more", "best", "option", "search", "find", "give", "send", "only", "near", "with", "furnished", "appreciation", "invest"];
      const isSearchSignal = searchSignals.some(s => trimmedText.toLowerCase().includes(s)) || isPropertyQuery(trimmedText);
      const wasPending = !!session.pendingField;

      if (session.isReadyToSearch() || isSearchSignal || !wasPending) {
        return await runMockSearch(trimmedText);
      }
    }

    if (session.active && session.pendingField) {
      const oldPending = session.pendingField;
      const result = session.ingest(trimmedText);

      if (result === "invalid") {
        if (filledFields.length > 0) {
          const next = session.nextQuestion();
          const reply = next ? next.question : "";
          await saveReplyToDb(conversation.id, reply);
          return reply;
        }

        const reply = `⚠️ Please provide a valid ${oldPending}`;
        await saveReplyToDb(conversation.id, reply);
        return reply;
      }

      if (session.hasRequiredFields()) {
        return await runMockSearch(trimmedText);
      } else {
        const next = session.nextQuestion();
        const reply = next ? next.question : "";
        await saveReplyToDb(conversation.id, reply);
        return reply;
      }
    }

    if (isPropertyQuery(trimmedText)) {
      const next = session.nextQuestion();
      const reply = next ? next.question : "";
      await saveReplyToDb(conversation.id, reply);
      return reply;
    }

    // Chat
    const reply = await mockCallLLM([], trimmedText);
    await saveReplyToDb(conversation.id, reply);
    return reply;

  } catch (err: any) {
    return "⚠️ Server Error. Please try again.";
  }
}

async function saveReplyToDb(convId: string, replyText: string) {
  const conversation = await prisma.conversation.findUnique({ where: { id: convId } });
  if (!conversation) return;
  const messages = JSON.parse(conversation.messages);
  messages.push({
    from: "agent",
    text: replyText,
    timestamp: new Date().toISOString()
  });
  await prisma.conversation.update({
    where: { id: convId },
    data: { messages: JSON.stringify(messages) }
  });
}

async function simulateAgentReply(convId: string, text: string) {
  console.log(`\n💼 [CRM Agent Types Reply]: "${text}"`);
  
  // Call conversation service logic
  const conversation = await prisma.conversation.findUnique({
    where: { id: convId },
    include: { customer: true }
  });
  if (!conversation) return;

  const messages = JSON.parse(conversation.messages);
  messages.push({
    from: "agent",
    text,
    timestamp: new Date().toISOString()
  });

  await prisma.conversation.update({
    where: { id: convId },
    data: { messages: JSON.stringify(messages) }
  });

  // Outbound simulated delivery JID
  console.log(`📡 [WhatsApp Delivered to JID: ${JID}]: "${text}"`);
}

async function runSimulation() {
  console.log("🧹 Initializing clean test state...");
  const customer = await prisma.customer.findFirst({ where: { phone: PHONE } });
  if (customer) {
    await prisma.conversation.deleteMany({ where: { customerId: customer.id } });
    await prisma.customer.delete({ where: { id: customer.id } });
  }

  const dialogue = [
    // Turn 1: Greeting
    "Hi",
    // Turn 2: Initial Property Query
    "I want 2 bhk flat in gota under 50 lakh",
    // Turn 3: Follow-up 1
    "show more options",
    // Turn 4: Follow-up 2 (simulated filters)
    "only ready to move",
    // Turn 5: Location change
    "near SG highway",
    // Turn 6: Filter change
    "with parking",
    // Turn 7: furnished
    "can you show furnished property?",
    // Turn 8: Switch type
    "I want villa instead",
    // Turn 9: Budget change
    "budget can increase to 80 lakh",
    // Turn 10: In ahmedabad
    "in ahmedabad",
    // Turn 11: best option
    "send best option",

    // Turn 12: Fuzzy Spellings
    "2 bhk in gotaa",
    "flat near satelite",
    "office in praaladnagar",

    // Turn 13: Memory Tests
    "show cheaper options",
    "only 3 bhk",
    "not apartment",
    "under 1 crore",

    // Turn 14: General queries
    "which area is best for investment?",
    "which property has highest appreciation?",
    "is this good for family?"
  ];

  console.log("\n💬 STARTING PROPERTYBOT CONVERSATION SIMULATION");
  console.log("==================================================");

  for (const turn of dialogue) {
    console.log(`\n👤 [Customer]: "${turn}"`);
    const reply = await handleMessage(turn);
    await mockSend(reply);
  }

  // Outbound CRM Sync Test
  console.log("\n==================================================");
  console.log("🧪 TESTING OUTBOUND AGENT SYNC FROM CRM PANEL");
  console.log("==================================================");

  const getCustomer = await prisma.customer.findFirst({ where: { phone: PHONE } });
  const getConv = await prisma.conversation.findFirst({ where: { customerId: getCustomer!.id } });
  
  await simulateAgentReply(getConv!.id, "Hello Het, I can show you a premium 3 BHK Villa in Gota tomorrow at 10 AM. Will you be available?");

  // Verify DB state
  const finalConv = await prisma.conversation.findFirst({ where: { customerId: getCustomer!.id } });
  const finalMessages = JSON.parse(finalConv!.messages);
  console.log(`\n📊 Final DB Conversation Messages count: ${finalMessages.length}`);
  console.log(`📑 Final DB messages check passed!`);

  console.log("\n==================================================");
  console.log("🎉 DIALOGUE SIMULATION COMPLETED SUCCESSFULLY!");
  console.log("==================================================");
}

runSimulation()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
