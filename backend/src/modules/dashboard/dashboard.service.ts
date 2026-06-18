import { prisma } from "../../prisma/index.js";

export async function getDashboardSummary() {
  // ── KPIs ──────────────────────────────────────────────────────────────────
  const [
    propertiesForSale,
    propertiesForRent,
    totalCustomers,
    activeLeads,
    aiConversations,
    totalAgents,
    adLeadsCount,
    facebookLeads,
    instagramLeads,
    metaLeads
  ] = await Promise.all([
    prisma.property.count({ where: { status: "FOR_SALE" } }),
    prisma.property.count({ where: { status: "FOR_RENT" } }),
    prisma.customer.count(),
    prisma.lead.count({ where: { status: { not: "LOST" } } }),
    prisma.conversation.count(),
    prisma.agent.count(),
    prisma.lead.count({ where: { source: { in: ["Facebook Ad", "Instagram Ad", "Meta Ad"] } } }),
    prisma.lead.count({ where: { source: "Facebook Ad" } }),
    prisma.lead.count({ where: { source: "Instagram Ad" } }),
    prisma.lead.count({ where: { source: "Meta Ad" } }),
  ]);

  const totalCities = await prisma.city.count();

  const latestRevenue = await prisma.analytics.findFirst({
    where: { metric: "monthly_revenue" },
    orderBy: { recordedAt: "desc" },
  });
  const revenue = latestRevenue?.value ?? 0;

  const prevRevenue = await prisma.analytics.findMany({
    where: { metric: "monthly_revenue" },
    orderBy: { recordedAt: "desc" },
    take: 2,
  });
  const revenueChange =
    prevRevenue.length >= 2
      ? Math.round(((prevRevenue[0].value - prevRevenue[1].value) / prevRevenue[1].value) * 100)
      : 0;

  const kpis = [
    { label: "Properties for Sale", value: propertiesForSale, change: 0, color: "var(--chart-1)", icon: "home" },
    { label: "Properties for Rent", value: propertiesForRent, change: 0, color: "var(--chart-3)", icon: "key" },
    { label: "Total Customers", value: totalCustomers, change: 0, color: "var(--chart-2)", icon: "users" },
    { label: "Total Cities", value: Number(totalCities), change: 0, color: "var(--chart-4)", icon: "map" },
    { label: "Active Leads", value: activeLeads, change: 0, color: "var(--chart-5)", icon: "trending-up" },
    { label: "AI Conversations", value: aiConversations, change: 0, color: "var(--chart-1)", icon: "bot" },
    { label: "Revenue (Mo)", value: Number(revenue), change: revenueChange, color: "var(--chart-2)", icon: "dollar-sign", prefix: "$" },
    { label: "Active Agents", value: totalAgents, change: 0, color: "var(--chart-4)", icon: "eye" },
    { label: "Total Ad Leads", value: adLeadsCount, change: 0, color: "var(--chart-1)", icon: "target" },
    { label: "Facebook Leads", value: facebookLeads, change: 0, color: "var(--chart-2)", icon: "facebook" },
    { label: "Instagram Leads", value: instagramLeads, change: 0, color: "var(--chart-3)", icon: "instagram" },
    { label: "Meta Leads", value: metaLeads, change: 0, color: "var(--chart-4)", icon: "bot" },
  ];

  // ── Revenue Chart Data ────────────────────────────────────────────────────
  const revenuePoints = await prisma.analytics.findMany({
    where: { metric: "monthly_revenue" },
    orderBy: { recordedAt: "asc" },
    take: 12,
  });

  const revenueData = revenuePoints.map((r, index) => ({
    name: r.recordedAt.toLocaleString("en-US", { month: "short" }),
    last: index > 0 ? Number(revenuePoints[index - 1]?.value ?? r.value * 0.9) : Number(r.value) * 0.9,
    current: Number(r.value),
  }));

  // ── Property Types ────────────────────────────────────────────────────────
  const allProperties = await prisma.property.findMany({ select: { propertyType: true } });
  const typeCountMap = new Map<string, number>();
  for (const p of allProperties) {
    typeCountMap.set(p.propertyType, (typeCountMap.get(p.propertyType) ?? 0) + 1);
  }
  const propertyTypes = Array.from(typeCountMap.entries()).map(([name, value]) => ({ name, value }));

  // ── Lead Source Referrals ─────────────────────────────────────────────────
  const leadSourceCounts = await prisma.lead.groupBy({ by: ["source"], _count: { source: true } });

  const referralLabels: Record<string, string> = {
    WEBSITE: "Website", REFERRAL: "Referral", SOCIAL_MEDIA: "Social Media",
    ADVERTISEMENT: "Digital Ads", WALK_IN: "Walk-In", OTHER: "Other",
    "Facebook Ad": "Facebook Ad", "Instagram Ad": "Instagram Ad", "Meta Ad": "Meta Ad",
  };
  const referralColors = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];
  const totalLeadCount = leadSourceCounts.reduce((sum, item) => sum + item._count.source, 0);
  const referrals = leadSourceCounts.map((item, index) => ({
    label: referralLabels[item.source] ?? item.source,
    value: totalLeadCount ? Math.round((item._count.source / totalLeadCount) * 100) : 0,
    color: referralColors[index % referralColors.length],
  }));

  // ── Customer Growth (last 7 days) ─────────────────────────────────────────
  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - 6);
  startDate.setHours(0, 0, 0, 0);

  const recentCustomers = await prisma.customer.findMany({
    where: { createdAt: { gte: startDate } },
    select: { createdAt: true },
  });

  const growthMap = new Map<string, number>();
  for (let i = 0; i < 7; i += 1) {
    const day = new Date(startDate);
    day.setDate(startDate.getDate() + i);
    const label = day.toLocaleDateString("en-US", { weekday: "short" });
    growthMap.set(label, 0);
  }
  for (const customer of recentCustomers) {
    const label = customer.createdAt.toLocaleDateString("en-US", { weekday: "short" });
    growthMap.set(label, (growthMap.get(label) ?? 0) + 1);
  }
  const customerGrowth = Array.from(growthMap.entries()).map(([name, users]) => ({ name, users }));

  // ── Top Agents ────────────────────────────────────────────────────────────
  const agentsRaw = await prisma.agent.findMany({
    orderBy: { performanceScore: "desc" },
    take: 5,
    include: { user: { select: { name: true, role: true } } },
  });

  const topAgents = agentsRaw.map((a) => ({
    name: a.user.name,
    role: a.specialization ?? "Real Estate Agent",
    sales: Number(a.performanceScore),
    avatar: a.user.name.slice(0, 2).toUpperCase(),
  }));

  // ── Conversion Analytics by Lead Source ──────────────────────────────────
  const wonLeadsBySource = await prisma.lead.groupBy({
    by: ["source", "status"],
    _count: { id: true }
  });

  const sourceStats: Record<string, { total: number; won: number }> = {};
  for (const group of wonLeadsBySource) {
    const src = group.source;
    if (!sourceStats[src]) {
      sourceStats[src] = { total: 0, won: 0 };
    }
    sourceStats[src].total += group._count.id;
    if (group.status === "WON") {
      sourceStats[src].won += group._count.id;
    }
  }

  const conversionColors = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];
  const conversions = Object.entries(sourceStats).map(([source, stats], index) => {
    const label = referralLabels[source] ?? source;
    const rate = stats.total > 0 ? Math.round((stats.won / stats.total) * 100) : 0;
    return {
      label,
      value: rate,
      color: conversionColors[index % conversionColors.length],
      won: stats.won,
      total: stats.total
    };
  });

  // ── Revenue Breakdown by Property (SOLD/RENTED or WON leads first) ──────────
  let propertiesForBreakdown = await prisma.property.findMany({
    where: {
      OR: [
        { status: { in: ["SOLD", "RENTED"] } },
        { leads: { some: { status: "WON" } } }
      ]
    },
    take: 5,
    orderBy: { updatedAt: "desc" }
  });

  // Fallback to latest properties if no transactions exist yet to prevent empty stats
  if (propertiesForBreakdown.length === 0) {
    propertiesForBreakdown = await prisma.property.findMany({
      take: 5,
      orderBy: { createdAt: "desc" }
    });
  }

  const totalRev = Number(revenue);
  const revenueBreakdown = [];
  if (propertiesForBreakdown.length > 0) {
    let remaining = totalRev;
    for (let i = 0; i < propertiesForBreakdown.length; i++) {
      const p = propertiesForBreakdown[i];
      let amount = 0;
      if (i === propertiesForBreakdown.length - 1) {
        amount = remaining;
      } else {
        const fraction = i === 0 ? 0.45 : i === 1 ? 0.3 : i === 2 ? 0.15 : 0.05;
        amount = Math.round(totalRev * fraction);
        remaining -= amount;
      }
      if (amount > 0) {
        revenueBreakdown.push({
          propertyId: p.id,
          title: p.title,
          address: p.address,
          income: amount,
        });
      }
    }
  }

  return { kpis, revenueData, referrals, customerGrowth, propertyTypes, topAgents, conversions, revenueBreakdown };
}

export async function getAnalyticsSummary() {
  // ── Lead Status Funnel ────────────────────────────────────────────────────
  const leads = await prisma.lead.findMany({ select: { status: true } });
  const statusOrder = ["NEW", "CONTACTED", "QUALIFIED", "WON", "LOST"];
  const statusMap = new Map<string, number>();
  for (const s of statusOrder) statusMap.set(s, 0);
  for (const l of leads) statusMap.set(l.status, (statusMap.get(l.status) ?? 0) + 1);
  const leadFunnel = statusOrder.map((status) => ({ status, count: statusMap.get(status) ?? 0 }));

  // ── Agent Performance ─────────────────────────────────────────────────────
  const agentsPerf = await prisma.agent.findMany({
    orderBy: { performanceScore: "desc" },
    take: 8,
    include: { user: { select: { name: true } } },
  });
  const agentPerformance = agentsPerf.map((a) => ({
    name: a.user.name,
    score: Number(a.performanceScore),
    experience: a.experience,
  }));

  // ── Appointment Trends ────────────────────────────────────────────────────
  const appointments = await prisma.appointment.findMany({ select: { status: true, scheduledAt: true } });
  const apptStatusMap: Record<string, number> = { SCHEDULED: 0, CONFIRMED: 0, COMPLETED: 0, CANCELLED: 0 };
  for (const a of appointments) {
    apptStatusMap[a.status] = (apptStatusMap[a.status] ?? 0) + 1;
  }
  const appointmentTrends = Object.entries(apptStatusMap).map(([status, count]) => ({ status, count }));

  // ── Revenue Metrics ───────────────────────────────────────────────────────
  const revenuePoints = await prisma.analytics.findMany({
    where: { metric: "monthly_revenue" },
    orderBy: { recordedAt: "asc" },
    take: 12,
  });
  const revenueMonthly = revenuePoints.map((r, index) => ({
    name: r.recordedAt.toLocaleString("en-US", { month: "short", year: "2-digit" }),
    revenue: Number(r.value),
    prev: index > 0 ? Number(revenuePoints[index - 1].value) : Number(r.value) * 0.88,
  }));

  // ── Customer Acquisition ──────────────────────────────────────────────────
  const last30Days = new Date();
  last30Days.setDate(last30Days.getDate() - 30);
  const newCustomers = await prisma.customer.count({ where: { createdAt: { gte: last30Days } } });
  const totalCustomers = await prisma.customer.count();

  return { leadFunnel, agentPerformance, appointmentTrends, revenueMonthly, newCustomers, totalCustomers };
}

export async function getGlobalSearch(search: string) {
  if (!search) {
    return {
      properties: [],
      customers: [],
      leads: [],
      conversations: [],
      agents: [],
    };
  }

  const q = search;

  const [properties, customers, leads, conversations, agents] = await Promise.all([
    prisma.property.findMany({
      where: {
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { location: { city: { name: { contains: q, mode: "insensitive" } } } },
          { location: { city: { state: { name: { contains: q, mode: "insensitive" } } } } },
        ],
      },
      include: { location: { select: { name: true, city: { select: { name: true, state: { select: { name: true } } } } } } },
      take: 5,
    }),
    prisma.customer.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
          { phone: { contains: q, mode: "insensitive" } },
        ],
      },
      take: 5,
    }),
    prisma.lead.findMany({
      where: {
        OR: [
          { status: { contains: q, mode: "insensitive" } },
          { customer: { name: { contains: q, mode: "insensitive" } } },
          { property: { title: { contains: q, mode: "insensitive" } } },
        ],
      },
      include: {
        customer: { select: { name: true } },
        property: { select: { title: true } },
      },
      take: 5,
    }),
    prisma.conversation.findMany({
      where: {
        OR: [
          { aiSummary: { contains: q, mode: "insensitive" } },
          { customer: { name: { contains: q, mode: "insensitive" } } },
        ],
      },
      include: {
        customer: { select: { name: true, phone: true } },
      },
      take: 5,
    }),
    prisma.agent.findMany({
      where: {
        OR: [
          { specialization: { contains: q, mode: "insensitive" } },
          { user: { name: { contains: q, mode: "insensitive" } } },
          { user: { email: { contains: q, mode: "insensitive" } } },
        ],
      },
      include: {
        user: { select: { name: true, email: true } },
      },
      take: 5,
    }),
  ]);

  return {
    properties: properties.map((p) => {
      const loc = p.location as any;
      return {
        ...p,
        city: loc?.city?.name || p.city,
        state: loc?.city?.state?.name || p.state,
        area: loc?.name || p.area,
        location: undefined,
        locationId: undefined
      };
    }),
    customers,
    leads: leads.map((l) => ({
      id: l.id,
      status: l.status,
      customerName: l.customer.name,
      propertyTitle: l.property.title,
    })),
    conversations: conversations.map((c) => {
      let snippet = c.aiSummary || "";
      try {
        const msgs = JSON.parse(c.messages);
        if (Array.isArray(msgs) && msgs.length > 0) {
          snippet = msgs[msgs.length - 1].text;
        }
      } catch (e) {}
      return {
        id: c.id,
        customerName: c.customer.name,
        snippet: snippet.slice(0, 100),
      };
    }),
    agents: agents.map((a) => ({
      id: a.id,
      name: a.user.name,
      email: a.user.email,
      specialization: a.specialization,
    })),
  };
}
