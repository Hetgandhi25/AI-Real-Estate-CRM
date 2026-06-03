import { prisma } from "../src/prisma/index.js";

async function runDatabaseValidation() {
  console.log("==================================================");
  console.log("📊 PHASE 3 — DATABASE VALIDATION & INTEGRITY");
  console.log("==================================================");

  // 1. Fetch counts
  const [
    users,
    customers,
    properties,
    leads,
    conversations,
    messages,
    appointments,
    auditLogs
  ] = await Promise.all([
    prisma.user.count(),
    prisma.customer.count(),
    prisma.property.count(),
    prisma.lead.count(),
    prisma.conversation.count(),
    prisma.message.count(),
    prisma.appointment.count(),
    prisma.auditLog.count()
  ]);

  console.log(`Counts:
  - Users: ${users}
  - Customers: ${customers}
  - Properties: ${properties}
  - Leads: ${leads}
  - Conversations: ${conversations}
  - Messages: ${messages}
  - Appointments: ${appointments}
  - Audit Logs: ${auditLogs}
  `);

  // Fetch all entity IDs to verify relational integrity in memory
  const [
    dbCustomerIds,
    dbPropertyIds,
    dbConversationIds,
    dbUserIds
  ] = await Promise.all([
    prisma.customer.findMany({ select: { id: true } }).then(res => new Set(res.map(r => r.id))),
    prisma.property.findMany({ select: { id: true } }).then(res => new Set(res.map(r => r.id))),
    prisma.conversation.findMany({ select: { id: true } }).then(res => new Set(res.map(r => r.id))),
    prisma.user.findMany({ select: { id: true } }).then(res => new Set(res.map(r => r.id)))
  ]);

  let issuesFound = 0;

  // Check 1: Conversations without a valid Customer
  const convs = await prisma.conversation.findMany({ select: { id: true, customerId: true } });
  const orphanConvs = convs.filter(c => !dbCustomerIds.has(c.customerId));
  if (orphanConvs.length > 0) {
    console.log(`❌ Fail: Found ${orphanConvs.length} orphan conversations (non-existent customer ID).`);
    issuesFound++;
  } else {
    console.log("✅ Passed: No orphan conversations found.");
  }

  // Check 2: Messages without a valid Conversation
  const msgs = await prisma.message.findMany({ select: { id: true, conversationId: true } });
  const orphanMsgs = msgs.filter(m => !dbConversationIds.has(m.conversationId));
  if (orphanMsgs.length > 0) {
    console.log(`❌ Fail: Found ${orphanMsgs.length} orphan messages (non-existent conversation ID).`);
    issuesFound++;
  } else {
    console.log("✅ Passed: No orphan messages found.");
  }

  // Check 3: Leads without a valid Customer or Property
  const dbLeads = await prisma.lead.findMany({ select: { id: true, customerId: true, propertyId: true } });
  const orphanLeads = dbLeads.filter(l => !dbCustomerIds.has(l.customerId) || !dbPropertyIds.has(l.propertyId));
  if (orphanLeads.length > 0) {
    console.log(`❌ Fail: Found ${orphanLeads.length} orphan leads (non-existent customer/property ID).`);
    issuesFound++;
  } else {
    console.log("✅ Passed: No orphan leads found.");
  }

  // Check 4: Appointments without a valid Customer
  const dbAppointments = await prisma.appointment.findMany({ select: { id: true, customerId: true, propertyId: true, assignedAgentId: true } });
  const orphanAppointments = dbAppointments.filter(a => 
    !dbCustomerIds.has(a.customerId) || 
    (a.propertyId && !dbPropertyIds.has(a.propertyId)) ||
    (a.assignedAgentId && !dbUserIds.has(a.assignedAgentId))
  );
  if (orphanAppointments.length > 0) {
    console.log(`❌ Fail: Found ${orphanAppointments.length} orphan appointments (non-existent customer/property/agent ID).`);
    issuesFound++;
  } else {
    console.log("✅ Passed: No orphan appointments found.");
  }

  console.log("\n==================================================");
  console.log(`🏁 Relational Integrity Validation Complete. Issues: ${issuesFound}`);
  console.log("==================================================");
}

runDatabaseValidation()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
