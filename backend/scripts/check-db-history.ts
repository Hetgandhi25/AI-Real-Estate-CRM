import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🔍 Fetching all conversations from PostgreSQL...");
  const conversations = await prisma.conversation.findMany({
    include: {
      customer: true
    }
  });

  if (conversations.length === 0) {
    console.log("⚠️ No conversations found in the database.");
    return;
  }

  for (const conv of conversations) {
    console.log(`\n==================================================`);
    console.log(`👤 Customer: ${conv.customer.name} (${conv.customer.phone})`);
    console.log(`📧 Email: ${conv.customer.email}`);
    console.log(`🆔 Conv ID: ${conv.id}`);
    console.log(`📑 Summary: ${conv.aiSummary}`);
    console.log(`--------------------------------------------------`);

    let messages: any[] = [];
    try {
      messages = typeof conv.messages === "string" ? JSON.parse(conv.messages) : conv.messages;
    } catch (e) {
      console.error("Failed to parse messages JSON:", e);
    }

    if (!Array.isArray(messages) || messages.length === 0) {
      console.log("No messages in this conversation thread.");
      continue;
    }

    for (const msg of messages) {
      const sender = msg.from === "customer" ? "👤 Customer" : "🤖 Bot/Agent";
      console.log(`[${msg.timestamp || "N/A"}] ${sender}: ${msg.text}`);
    }
    console.log(`==================================================\n`);
  }
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
