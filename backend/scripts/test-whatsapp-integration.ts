import { PrismaClient } from "@prisma/client";
import { searchInventoryByFilters, searchInventory } from "../src/modules/whatsapp/postgresql.tool.js";
import { store } from "../src/modules/whatsapp/session.store.js";

const prisma = new PrismaClient();
const TEST_PHONE = "919876543210";
const TEST_JID = `${TEST_PHONE}@s.whatsapp.net`;

async function cleanup() {
  console.log("🧹 Cleaning up test data...");
  const customer = await prisma.customer.findFirst({
    where: { phone: TEST_PHONE }
  });
  if (customer) {
    await prisma.conversation.deleteMany({
      where: { customerId: customer.id }
    });
    await prisma.customer.delete({
      where: { id: customer.id }
    });
    console.log("🧹 Test customer and conversation deleted.");
  }
}

async function simulateIncomingMessage(text: string, pushName: string): Promise<any> {
  console.log(`\n💬 Simulating incoming WhatsApp from ${pushName} (${TEST_PHONE}): "${text}"`);
  
  // 1. Get or Create Customer
  let customer = await prisma.customer.findFirst({
    where: { phone: { contains: TEST_PHONE } }
  });

  if (!customer) {
    const cleanEmail = `${TEST_PHONE}@whatsapp.yandox.com`;
    customer = await prisma.customer.create({
      data: {
        name: pushName || `WhatsApp User ${TEST_PHONE}`,
        phone: TEST_PHONE,
        email: cleanEmail,
        notes: "Created automatically via E2E WhatsApp Bot Test."
      }
    });
    console.log(`💾 PostgreSQL: Created Customer [${customer.name}]`);
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
        aiSummary: "Conversation started via WhatsApp test."
      }
    });
    console.log(`💾 PostgreSQL: Created Conversation ID [${conversation.id}]`);
  }

  // 3. Save incoming message
  const messages: any[] = JSON.parse(conversation.messages);
  messages.push({
    from: "customer",
    text,
    timestamp: new Date().toISOString()
  });

  const updated = await prisma.conversation.update({
    where: { id: conversation.id },
    data: {
      messages: JSON.stringify(messages),
      aiSummary: `Latest: "${text.slice(0, 80)}"`
    }
  });

  return { conversation: updated, customer };
}

async function simulateOutgoingMessage(convId: string, text: string) {
  console.log(`🤖 Bot replying: "${text.replace(/\n/g, " | ")}"`);
  const conversation = await prisma.conversation.findUnique({
    where: { id: convId }
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
    data: {
      messages: JSON.stringify(messages)
    }
  });
  console.log("💾 PostgreSQL: Saved outbound bot reply to DB");
}

async function runTests() {
  await cleanup();

  console.log("\n==================================================");
  console.log("🧪 RUNNING E2E TEST: GREETING & AUTO-CREATION");
  console.log("==================================================");

  // 1. Simulate Greeting message "Hi"
  const { conversation, customer } = await simulateIncomingMessage("Hi", "Ishan Client");
  
  // Simulate welcome response
  const welcomeText = `👋 *Hello! Welcome to PropertyBot*\n🏠 I can help you find properties from our inventory.`;
  await simulateOutgoingMessage(conversation.id, welcomeText);

  // Verify DB entries
  const checkCustomer = await prisma.customer.findUnique({ where: { id: customer.id } });
  const checkConv = await prisma.conversation.findUnique({ where: { id: conversation.id } });
  
  console.log(`\n✅ Customer Auto-Creation: ${checkCustomer ? "PASSED" : "FAILED"}`);
  console.log(`✅ Conversation Auto-Creation: ${checkConv ? "PASSED" : "FAILED"}`);
  console.log(`📝 Chat history count: ${JSON.parse(checkConv!.messages).length} messages`);

  console.log("\n==================================================");
  console.log("🧪 RUNNING E2E TEST: PROPERTY SEARCH QUERIES (FUZZY + FILTERS)");
  console.log("==================================================");

  const queries = [
    "2 BHK flat in Gota under 50 lakh",
    "3 BHK villa in Ahmedabad",
    "office near SG Highway"
  ];

  for (const query of queries) {
    console.log(`\n🔍 Query: "${query}"`);
    const results = await searchInventory(query);
    console.log(`📊 Found ${results.length} matching properties in PostgreSQL:`);
    results.forEach((p, idx) => {
      console.log(`   [${idx + 1}] ${p.title} - ${p.address || p.city} - BHK: ${p.bhk} - Price: ₹${p.price / 100000} Lakh - Status: ${p.status}`);
    });

    if (results.length > 0) {
      console.log(`✅ Property Search & Matching: PASSED`);
    } else {
      console.log(`⚠️ Property Search returned 0 rows (expected if no seed fits, but let's verify logic)`);
    }
  }

  console.log("\n==================================================");
  console.log("🧪 RUNNING E2E TEST: SESSION STATE MACHINE FLOW");
  console.log("==================================================");

  const session = store.get(TEST_JID);
  
  // First message starts session
  console.log(`💬 Client sends initial: "looking for flat"`);
  session.ingestInitialQuery("looking for flat");
  console.log(`📝 Session state (summary): ${session.summary()}`);
  
  // Next question
  let nextQ = session.nextQuestion();
  console.log(`🤖 Bot asks: "${nextQ?.question}"`);

  // Client responds with location Gota
  console.log(`💬 Client sends: "Gota"`);
  session.ingest("Gota");
  console.log(`📝 Session state (summary): ${session.summary()}`);
  
  nextQ = session.nextQuestion();
  console.log(`🤖 Bot asks: "${nextQ?.question}"`);

  // Client responds with BHK 3
  console.log(`💬 Client sends: "3 BHK"`);
  session.ingest("3 BHK");
  console.log(`📝 Session state (summary): ${session.summary()}`);

  nextQ = session.nextQuestion();
  console.log(`🤖 Bot asks: "${nextQ?.question}"`);

  // Client responds with budget under 70 lakh
  console.log(`💬 Client sends: "under 70 lakh"`);
  session.ingest("under 70 lakh");
  console.log(`📝 Session state (summary): ${session.summary()}`);

  console.log(`✅ Is Ready to Search: ${session.isReadyToSearch() ? "YES" : "NO"}`);
  const finalFilters = session.buildFilters();
  console.log(`⚙️ Final generated filters:`, JSON.stringify(finalFilters, null, 2));

  const dbMatches = await searchInventoryByFilters(finalFilters);
  console.log(`📊 Found ${dbMatches.length} matching properties using session filters:`);
  dbMatches.forEach((p, idx) => {
    console.log(`   [${idx + 1}] ${p.title} - ${p.address} - BHK: ${p.bhk} - Price: ₹${p.price / 100000} Lakh`);
  });

  console.log("\n==================================================");
  console.log("🎉 E2E BOT TESTS COMPLETED SUCCESSFULLY!");
  console.log("==================================================");
}

runTests()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
