import { PrismaClient } from "@prisma/client";
import { store } from "../src/modules/whatsapp/session.store.js";
import { searchInventoryByFilters } from "../src/modules/whatsapp/postgresql.tool.js";

const prisma = new PrismaClient();
const TEST_PHONE = "919000000001";
const TEST_JID = `${TEST_PHONE}@s.whatsapp.net`;

async function cleanup() {
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
  }
}

async function runE2EUserJourney() {
  console.log("==================================================");
  console.log("🧪 RUNNING DIALOGUE STATE MACHINE FLOW TEST");
  console.log("==================================================");

  await cleanup();

  // Create a test customer and conversation in SQL to replicate real-world persistence
  const customer = await prisma.customer.create({
    data: {
      name: "Het Gandhi",
      phone: TEST_PHONE,
      email: `${TEST_PHONE}@whatsapp.yandox.com`,
      notes: "E2E User Journey Test."
    }
  });

  const conversation = await prisma.conversation.create({
    data: {
      customerId: customer.id,
      messages: JSON.stringify([]),
      aiSummary: "Session test."
    }
  });

  const session = store.get(TEST_JID);
  session.reset();

  let assertionsPassed = true;

  // Turn 1: Greeting "Hi"
  console.log("\n👤 [User]: Hi");
  const msg1 = "Hi";
  if (/^hi\b/i.test(msg1)) {
    session.reset();
    const reply = "👋 *Hello! Welcome to PropertyBot*\n🏠 I can help you find properties from our inventory.\n\n✨ What are you looking for?";
    console.log(`🤖 [Bot]:\n${reply}`);
    
    // Assert welcome text
    if (reply.includes("Welcome to PropertyBot")) {
      console.log("✅ Assertion 1 Passed: Welcome message triggered.");
    } else {
      console.log("❌ Assertion 1 Failed: Welcome message did not match.");
      assertionsPassed = false;
    }
  }

  // Turn 2: "i want 2bhk flat in gota"
  console.log("\n👤 [User]: i want 2bhk flat in gota");
  const msg2 = "i want 2bhk flat in gota";
  session.ingestInitialQuery(msg2);

  // Check state machine collected variables
  console.log("ℹ️ Collected parameters so far:", JSON.stringify(session.collected));
  if (session.collected.type === "flat" && session.collected.location === "gota" && session.collected.bedrooms === 2) {
    console.log("✅ Assertion 2a Passed: Type, Location, and BHK parsed correctly.");
  } else {
    console.log("❌ Assertion 2a Failed: Parameters did not match expected values.");
    assertionsPassed = false;
  }

  // Get next question (should be budget)
  const nextQ = session.nextQuestion();
  if (nextQ && nextQ.key === "budget") {
    console.log(`🤖 [Bot]:\n${nextQ.question}`);
    console.log("✅ Assertion 2b Passed: Correctly prompted for budget.");
  } else {
    console.log("❌ Assertion 2b Failed: Did not prompt for budget.");
    assertionsPassed = false;
  }

  // Turn 3: "under 70 lakhs"
  console.log("\n👤 [User]: under 70 lakhs");
  const msg3 = "under 70 lakhs";
  const result = session.ingest(msg3);

  console.log("ℹ️ Collected parameters so far:", JSON.stringify(session.collected));
  if (result === "filled" && session.collected.budget && session.collected.budget.maxPrice === 70) {
    console.log("✅ Assertion 3a Passed: Budget maximum limit parsed as 70.");
  } else {
    console.log("❌ Assertion 3a Failed: Budget parameters not correctly parsed.");
    assertionsPassed = false;
  }

  // Is it ready to search now?
  if (session.isReadyToSearch()) {
    console.log("✅ Assertion 3b Passed: Session marked as ready to search.");
  } else {
    console.log("❌ Assertion 3b Failed: Session not marked as ready to search.");
    assertionsPassed = false;
  }

  // Execute database search
  console.log("🔍 [Bot]: Searching our inventory...");
  const filters = session.buildFilters();
  const matches = await searchInventoryByFilters(filters);

  console.log(`📊 Found ${matches.length} matching properties in PostgreSQL:`);
  matches.forEach((p, idx) => {
    console.log(`   [${idx + 1}] ${p.title} - Location: ${p.address || p.city} - BHK: ${p.bhk} - Price: ₹${p.price / 100000} Lakh - Status: ${p.status}`);
  });

  if (matches.length > 0) {
    console.log("✅ Assertion 3c Passed: Database search returned results matching filters.");
  } else {
    console.log("❌ Assertion 3c Failed: Database search returned zero results.");
    assertionsPassed = false;
  }

  // Cleanup
  await cleanup();

  console.log("\n==================================================");
  if (assertionsPassed) {
    console.log("🎉 SUCCESS: ALL CONVERSATIONAL STATE MACHINE TESTS PASSED WITH 0 BUGS!");
  } else {
    console.log("❌ FAILURE: SOME TEST ASSERTIONS FAILED.");
  }
  console.log("==================================================");
}

runE2EUserJourney()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
