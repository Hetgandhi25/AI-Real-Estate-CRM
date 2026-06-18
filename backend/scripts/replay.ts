import { prisma } from "../src/prisma/index.js";
import { whatsappQueue } from "../src/modules/whatsapp/whatsapp.queue.js";
import { redisConnection } from "../src/modules/whatsapp/redis.js";

async function replay() {
  console.log("▶️ Running replay job...");
  const candidates = await prisma.webhookEvent.findMany({
    where: { status: "RECEIVED", queuedAt: null },
  });

  console.log(`Found ${candidates.length} replay candidates.`);

  for (const event of candidates) {
    try {
      await whatsappQueue.add("whatsapp_message", event.payload, {
        jobId: event.messageId,
      });
      await prisma.webhookEvent.update({
        where: { id: event.id },
        data: { status: "QUEUED", queuedAt: new Date() },
      });
      console.log(`✅ Replayed ${event.messageId}`);
    } catch (err: any) {
      console.error(`❌ Failed to replay ${event.messageId}:`, err.message);
    }
  }

  redisConnection.disconnect();
  process.exit(0);
}

replay().catch(console.error);
