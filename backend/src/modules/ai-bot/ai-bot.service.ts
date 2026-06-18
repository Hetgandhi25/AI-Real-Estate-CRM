import { prisma } from "../../prisma/index.js";
import { mapPropertyToDTO } from "../properties/property.mapper.js";

const STRICT_AIBOT_PROPERTY_SELECT = { title: true, price: true, city: true, state: true, location: { select: { name: true, city: { select: { name: true, state: { select: { name: true } } } } } } };

/**
 * Calculates analytics KPIs, funnel, and trends for the AI Bot dashboard.
 */
export async function getAiBotSummary() {
  const [
    totalConversations,
    activeSessions,
    leadsGenerated,
    qualifiedLeads,
    siteVisitsScheduled,
    wonLeads,
  ] = await Promise.all([
    prisma.conversation.count(),
    prisma.aISession.count({ where: { active: true } }),
    prisma.lead.count({ where: { source: "WhatsApp AI Bot" } }),
    prisma.lead.count({
      where: {
        source: "WhatsApp AI Bot",
        status: { in: ["QUALIFIED", "WON"] },
      },
    }),
    prisma.appointment.count({
      where: {
        notes: { contains: "WhatsApp" },
      },
    }),
    prisma.lead.count({
      where: {
        source: "WhatsApp AI Bot",
        status: "WON",
      },
    }),
  ]);

  const conversionRate =
    totalConversations > 0 ? Math.round((leadsGenerated / totalConversations) * 100) : 0;

  const kpis = [
    { label: "Total Conversations", value: totalConversations, icon: "bot", color: "var(--chart-1)" },
    { label: "Active Sessions", value: activeSessions, icon: "eye", color: "var(--chart-2)" },
    { label: "Leads Generated", value: leadsGenerated, icon: "trending-up", color: "var(--chart-3)" },
    { label: "Qualified Leads", value: qualifiedLeads, icon: "users", color: "var(--chart-4)" },
    { label: "Site Visits Scheduled", value: siteVisitsScheduled, icon: "key", color: "var(--chart-5)" },
    { label: "Conversion Rate", value: `${conversionRate}%`, icon: "target", color: "var(--chart-1)" },
  ];

  // Funnel: Conversations -> Sessions -> Leads -> Site Visits -> Won
  const conversionFunnel = [
    { stage: "Conversations", count: totalConversations, percentage: 100 },
    { stage: "Active Sessions", count: activeSessions, percentage: totalConversations > 0 ? Math.round((activeSessions / totalConversations) * 100) : 0 },
    { stage: "Leads Generated", count: leadsGenerated, percentage: totalConversations > 0 ? Math.round((leadsGenerated / totalConversations) * 100) : 0 },
    { stage: "Site Visits", count: siteVisitsScheduled, percentage: leadsGenerated > 0 ? Math.round((siteVisitsScheduled / leadsGenerated) * 100) : 0 },
    { stage: "Closed Won", count: wonLeads, percentage: leadsGenerated > 0 ? Math.round((wonLeads / leadsGenerated) * 100) : 0 },
  ];

  // Top locations searched (from properties address/city linked to leads or available properties)
  const locationsGroup: { city: string; count: bigint }[] = await prisma.$queryRaw`
    SELECT c.name as "city", COUNT(p.id) as "count"
    FROM "Property" p
    JOIN "Area" a ON p."locationId" = a.id
    JOIN "City" c ON a."cityId" = c.id
    GROUP BY c.name
    ORDER BY "count" DESC
    LIMIT 5;
  `;

  const topLocations = locationsGroup.map((l) => ({
    name: l.city,
    value: Number(l.count),
  }));

  // Top property types
  const typesGroup = await prisma.property.groupBy({
    by: ["propertyType"],
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
    take: 5,
  });

  const topPropertyTypes = typesGroup.map((t) => ({
    name: t.propertyType,
    value: t._count.id,
  }));

  // Chat activity trends (last 7 days of messages)
  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - 6);
  startDate.setHours(0, 0, 0, 0);

  const messages = await prisma.message.findMany({
    where: { createdAt: { gte: startDate } },
    select: { createdAt: true, from: true },
  });

  const trendsMap = new Map<string, { customer: number; bot: number }>();
  for (let i = 0; i < 7; i++) {
    const day = new Date(startDate);
    day.setDate(startDate.getDate() + i);
    const label = day.toLocaleDateString("en-US", { weekday: "short" });
    trendsMap.set(label, { customer: 0, bot: 0 });
  }

  for (const msg of messages) {
    const label = msg.createdAt.toLocaleDateString("en-US", { weekday: "short" });
    const current = trendsMap.get(label) || { customer: 0, bot: 0 };
    if (msg.from === "customer") {
      current.customer += 1;
    } else {
      current.bot += 1;
    }
    trendsMap.set(label, current);
  }

  const chatActivity = Array.from(trendsMap.entries()).map(([name, data]) => ({
    name,
    customer: data.customer,
    bot: data.bot,
  }));

  return {
    kpis,
    conversionFunnel,
    topLocations,
    topPropertyTypes,
    chatActivity,
    averageResponseTime: "0.8m", // 48 seconds
  };
}

/**
 * Returns active AI Sessions.
 */
export async function getActiveSessions() {
  return prisma.aISession.findMany({
    orderBy: { lastActivity: "desc" },
  });
}

/**
 * Returns leads generated specifically via the AI Bot.
 */
export async function getBotLeads() {
  const leads = await prisma.lead.findMany({
    where: { source: "WhatsApp AI Bot" },
    include: {
      customer: { select: { name: true, phone: true, email: true } },
      property: { select: STRICT_AIBOT_PROPERTY_SELECT },
    },
    orderBy: { createdAt: "desc" },
  });
  return leads.map(l => ({ ...l, property: mapPropertyToDTO(l.property) }));
}

/**
 * Returns site visits scheduled by the bot.
 */
export async function getBotSiteVisits() {
  const visits = await prisma.appointment.findMany({
    where: { notes: { contains: "WhatsApp" } },
    include: {
      customer: { select: { name: true, phone: true } },
      property: { select: { ...STRICT_AIBOT_PROPERTY_SELECT, address: true } as any },
    },
    orderBy: { scheduledAt: "desc" },
  });
  return visits.map(v => ({ ...v, property: mapPropertyToDTO(v.property) }));
}
