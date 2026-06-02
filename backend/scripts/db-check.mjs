import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.count();
  const properties = await prisma.property.count();
  const customers = await prisma.customer.count();
  const leads = await prisma.lead.count();
  console.log(JSON.stringify({ users, properties, customers, leads }, null, 2));
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
