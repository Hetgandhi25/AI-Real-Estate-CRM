import { prisma } from "../src/prisma/index.js";
import { runOpenClawAgent } from "../src/modules/whatsapp/openclaw.agent.js";

const PHONE_NUMBERS = [
  "+91 90000 12345",
  "90000 12345", // Testing endsWith resolution
  "+91 91111 22222",
  "+91 92222 33333",
  "93333 44444"
];

const CONVERSATIONS = [
  // User 1: Searching and scheduling
  { phone: PHONE_NUMBERS[0], name: "Het Gandhi", text: "Hello, I am looking for a flat" },
  { phone: PHONE_NUMBERS[0], name: "Het Gandhi", text: "I want a 3 BHK flat in Ahmedabad under 80 lakh" },
  { phone: PHONE_NUMBERS[0], name: "Het Gandhi", text: "Are there any flats with a pool or parking?" },
  { phone: PHONE_NUMBERS[0], name: "Het Gandhi", text: "I am interested" },
  { phone: PHONE_NUMBERS[0], name: "Het Gandhi", text: "Can we schedule a visit tomorrow at 15:00?" },

  // User 2: Villa search and budget limits (testing endsWith matching)
  { phone: PHONE_NUMBERS[1], name: "Het Gandhi", text: "Hey! I want a villa near SG Highway" },
  { phone: PHONE_NUMBERS[1], name: "Het Gandhi", text: "My budget is 1.5 crore" },
  { phone: PHONE_NUMBERS[1], name: "Het Gandhi", text: "Show me luxury villas with a terrace" },
  { phone: PHONE_NUMBERS[1], name: "Het Gandhi", text: "I want to tour the villa" },
  { phone: PHONE_NUMBERS[1], name: "Het Gandhi", text: "Schedule a visit on 2026-06-10 at 11:30" },

  // User 3: Rentals and Office spaces
  { phone: PHONE_NUMBERS[2], name: "Alice Smith", text: "Hi, I need a rental property" },
  { phone: PHONE_NUMBERS[2], name: "Alice Smith", text: "Are there any offices for rent?" },
  { phone: PHONE_NUMBERS[2], name: "Alice Smith", text: "What about a long-term hotel suite in New York?" },
  { phone: PHONE_NUMBERS[2], name: "Alice Smith", text: "I am interested" },
  { phone: PHONE_NUMBERS[2], name: "Alice Smith", text: "Call me tomorrow" },

  // User 4: Specific property interest and lead creation
  { phone: PHONE_NUMBERS[3], name: "Bob Jones", text: "Hi PropertyBot!" },
  { phone: PHONE_NUMBERS[3], name: "Bob Jones", text: "I want a 2 BHK" },
  { phone: PHONE_NUMBERS[3], name: "Bob Jones", text: "Show me properties in Miami" },
  { phone: PHONE_NUMBERS[3], name: "Bob Jones", text: "I am interested in Miami Beach Apartment" },
  { phone: PHONE_NUMBERS[3], name: "Bob Jones", text: "Please create a lead for me" },

  // User 5: General queries and various parameters
  { phone: PHONE_NUMBERS[4], name: "Charlie Brown", text: "Hello" },
  { phone: PHONE_NUMBERS[4], name: "Charlie Brown", text: "I need a property near my office in Seattle" },
  { phone: PHONE_NUMBERS[4], name: "Charlie Brown", text: "What is the price of Seattle Tech Hub Office?" },
  { phone: PHONE_NUMBERS[4], name: "Charlie Brown", text: "I want to rent it" },
  { phone: PHONE_NUMBERS[4], name: "Charlie Brown", text: "Reset search" }
];

async function main() {
  console.log("==================================================");
  console.log("🚀 STARTING REALISTIC USER JOURNEY SIMULATION");
  console.log(`📋 Total Dialogues to Run: ${CONVERSATIONS.length}`);
  console.log("==================================================");

  // Clean database test customer records first to ensure clean state
  const cleanPhones = PHONE_NUMBERS.map(p => p.replace(/[^0-9]/g, "").slice(-10));
  for (const last10 of cleanPhones) {
    const customer = await prisma.customer.findFirst({
      where: { phone: { endsWith: last10 } }
    });
    if (customer) {
      console.log(`🧹 Cleaning existing test data for customer ${customer.name} (${customer.phone})`);
      // Delete child associations first to prevent cascade lockouts
      await prisma.appointment.deleteMany({ where: { customerId: customer.id } });
      await prisma.lead.deleteMany({ where: { customerId: customer.id } });
      const conversation = await prisma.conversation.findFirst({ where: { customerId: customer.id } });
      if (conversation) {
        await prisma.message.deleteMany({ where: { conversationId: conversation.id } });
        await prisma.conversation.delete({ where: { id: conversation.id } });
      }
      await prisma.customer.delete({ where: { id: customer.id } });
    }
  }

  // Run user journeys sequentially
  let successCount = 0;
  let failureCount = 0;

  for (let i = 0; i < CONVERSATIONS.length; i++) {
    const turn = CONVERSATIONS[i];
    console.log(`\n💬 [Turn ${i + 1}/${CONVERSATIONS.length}] Phone: ${turn.phone} | User: ${turn.name}`);
    console.log(`👤 Customer Input: "${turn.text}"`);

    try {
      const reply = await runOpenClawAgent({
        phone: turn.phone,
        pushName: turn.name,
        userMessage: turn.text
      });

      console.log(`🤖 Agent Reply:   "${reply.replace(/\n/g, " ")}"`);
      successCount++;
    } catch (err: any) {
      console.error(`❌ Error in Turn ${i + 1}:`, err.message);
      failureCount++;
    }
  }

  console.log("\n==================================================");
  console.log("📊 SIMULATION COMPLETE — VERIFYING DB ASSERTIONS");
  console.log("==================================================");

  // 1. Check Customer Count (should be 4 unique customers since PHONE_NUMBERS[0] and [1] resolve to the SAME customer!)
  // Phone 0 is "+91 90000 12345" (ends in 9000012345)
  // Phone 1 is "90000 12345" (ends in 9000012345)
  // These two MUST resolve to the exact same customer record!
  const customers = await prisma.customer.findMany({
    where: {
      OR: cleanPhones.map(last10 => ({ phone: { endsWith: last10 } }))
    }
  });
  console.log(`👥 Unique Customers created in DB: ${customers.length} (Expected: 4)`);
  if (customers.length === 4) {
    console.log("✅ Customer deduplication and endsWith resolution passed!");
  } else {
    console.log("❌ Customer count mismatch! EndsWith resolution might have failed.");
  }

  // 2. Check Conversation and Message records
  const conversations = await prisma.conversation.findMany({
    where: { customerId: { in: customers.map(c => c.id) } }
  });
  console.log(`💬 Conversations created in DB: ${conversations.length} (Expected: 4)`);

  const messagesCount = await prisma.message.count({
    where: { conversationId: { in: conversations.map(c => c.id) } }
  });
  console.log(`✉️ Total Message records in Message table: ${messagesCount} (Expected: 50 — 25 customer messages + 25 agent replies)`);
  if (messagesCount === 50) {
    console.log("✅ Granular Message logging sync passed!");
  } else {
    console.log(`⚠️ Message records count is ${messagesCount}/50. Please check sync logs.`);
  }

  // 3. Check Leads generated
  const leads = await prisma.lead.findMany({
    where: { customerId: { in: customers.map(c => c.id) } }
  });
  console.log(`📈 Leads generated: ${leads.length}`);

  // 4. Check Appointments scheduled
  const appointments = await prisma.appointment.findMany({
    where: { customerId: { in: customers.map(c => c.id) } }
  });
  console.log(`📅 Appointments scheduled: ${appointments.length}`);

  console.log("\n==================================================");
  console.log(`🏁 Simulation Summary: ${successCount} successful turns, ${failureCount} failed.`);
  console.log("==================================================");
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
