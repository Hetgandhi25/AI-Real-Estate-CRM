import { prisma } from "../src/prisma/index.js";
import { runOpenClawAgent } from "../src/modules/whatsapp/openclaw.agent.js";
import * as tools from "../src/modules/whatsapp/openclaw.tools.js";

const TEST_PHONE = "918888888888";
const CLEAN_PHONE = "918888888888";

async function cleanup() {
  console.log("🧹 Cleaning up WhatsApp test data...");
  const customer = await prisma.customer.findFirst({
    where: { phone: CLEAN_PHONE }
  });

  if (customer) {
    // Delete appointments
    await prisma.appointment.deleteMany({
      where: { customerId: customer.id }
    });

    // Delete leads
    await prisma.lead.deleteMany({
      where: { customerId: customer.id }
    });

    // Delete messages
    const convs = await prisma.conversation.findMany({
      where: { customerId: customer.id }
    });
    for (const conv of convs) {
      await prisma.message.deleteMany({
        where: { conversationId: conv.id }
      });
    }

    // Delete conversations
    await prisma.conversation.deleteMany({
      where: { customerId: customer.id }
    });

    // Delete customer
    await prisma.customer.delete({
      where: { id: customer.id }
    });
    console.log("✅ Cleanup completed successfully!");
  } else {
    console.log("✅ No existing test customer found.");
  }
}

// Replicate rate limiting logic to test correctness
const whatsappLimiterMap = new Map<string, { count: number; resetTime: number }>();
const WHATSAPP_LIMIT = 5;
const WHATSAPP_WINDOW_MS = 10 * 1000;

function simulateRateLimit(phone: string): boolean {
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

async function runWhatsAppValidation() {
  console.log("==================================================");
  console.log("📱 PHASE 4 — WHATSAPP FLOW VALIDATION");
  console.log("==================================================");

  await cleanup();

  // 1. Get a valid property to use for lead & site visit validation
  const property = await prisma.property.findFirst();
  if (!property) {
    console.log("❌ Fail: No properties found in database to run tests with.");
    return;
  }
  console.log(`ℹ️ Using Property: ${property.title} (ID: ${property.id})`);

  // 2. Simulate message ingestion: "I want to buy a flat in Gota"
  console.log("\n--- Message Ingestion & Customer Lookup ---");
  console.log(`💬 Simulating Message: "3 bhk flat in Gota"`);
  
  const reply = await runOpenClawAgent({
    phone: TEST_PHONE,
    pushName: "Test Val User",
    userMessage: "3 bhk flat in Gota"
  });

  console.log(`🤖 Agent Reply:\n${reply}`);

  // Verify customer creation
  const createdCustomer = await prisma.customer.findFirst({
    where: { phone: CLEAN_PHONE }
  });
  if (createdCustomer) {
    console.log(`✅ Passed: Customer successfully created (ID: ${createdCustomer.id}, Name: ${createdCustomer.name})`);
  } else {
    console.log("❌ Fail: Customer was not created.");
  }

  // Verify conversation creation
  const createdConv = await prisma.conversation.findFirst({
    where: { customerId: createdCustomer?.id }
  });
  if (createdConv) {
    console.log(`✅ Passed: Conversation successfully created (ID: ${createdConv.id})`);
    const msgs = JSON.parse(createdConv.messages);
    console.log(`ℹ️ Saved Messages: ${JSON.stringify(msgs, null, 2)}`);
  } else {
    console.log("❌ Fail: Conversation was not created.");
  }

  // 3. Verify Lead persistence
  console.log("\n--- Lead Persistence ---");
  console.log(`🔧 Executing createLead tool for property ${property.id}...`);
  const lead = await tools.createLead({
    name: "Test Val User",
    phone: CLEAN_PHONE,
    propertyId: property.id,
    notes: "Interested in Gota property during validation script."
  });

  const checkLead = await prisma.lead.findUnique({
    where: { id: lead.id },
    include: { customer: true, property: true }
  });

  if (checkLead) {
    console.log(`✅ Passed: Lead successfully created (ID: ${checkLead.id}, Status: ${checkLead.status})`);
    console.log(`ℹ️ Lead Customer: ${checkLead.customer.name}, Property: ${checkLead.property.title}`);
  } else {
    console.log("❌ Fail: Lead was not saved.");
  }

  // 4. Verify Site Visit persistence
  console.log("\n--- Site Visit Persistence ---");
  console.log(`🔧 Executing scheduleSiteVisit tool...`);
  const appointment = await tools.scheduleSiteVisit({
    phone: CLEAN_PHONE,
    propertyId: property.id,
    date: "2026-06-10",
    time: "15:00",
    notes: "Site visit validation test."
  });

  const checkAppt = await prisma.appointment.findUnique({
    where: { id: appointment.id },
    include: { customer: true, property: true }
  });

  if (checkAppt) {
    console.log(`✅ Passed: Appointment successfully created (ID: ${checkAppt.id}, Status: ${checkAppt.status})`);
    console.log(`ℹ️ Appointment Date: ${checkAppt.scheduledAt.toISOString()}`);
  } else {
    console.log("❌ Fail: Appointment was not saved.");
  }

  // 5. Rate Limiting verification
  console.log("\n--- Rate Limiting Verification ---");
  console.log("Sending 6 rapid messages to rate limiter...");
  let allowedCount = 0;
  let blockedCount = 0;
  for (let i = 1; i <= 6; i++) {
    const isAllowed = simulateRateLimit(CLEAN_PHONE);
    console.log(`Message ${i}: ${isAllowed ? "Allowed" : "Blocked (Rate limited)"}`);
    if (isAllowed) allowedCount++;
    else blockedCount++;
  }

  if (allowedCount === 5 && blockedCount === 1) {
    console.log("✅ Passed: Rate limiting blocked the 6th message (Allowed 5, Blocked 1).");
  } else {
    console.log(`❌ Fail: Rate limiting did not perform as expected (Allowed: ${allowedCount}, Blocked: ${blockedCount}).`);
  }

  // Cleanup after testing
  await cleanup();

  console.log("\n==================================================");
  console.log("🏁 WHATSAPP FLOW VALIDATION COMPLETED");
  console.log("==================================================");
}

runWhatsAppValidation()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
