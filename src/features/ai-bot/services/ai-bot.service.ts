import { apiGet } from "@/api";
import { env } from "@/config";

export interface AiBotSummary {
  kpis: { label: string; value: string | number; icon: string; color: string }[];
  conversionFunnel: { stage: string; count: number; percentage: number }[];
  topLocations: { name: string; value: number }[];
  topPropertyTypes: { name: string; value: number }[];
  chatActivity: { name: string; customer: number; bot: number }[];
  averageResponseTime: string;
}

export interface AiSession {
  id: string;
  phone: string;
  collected: string;
  pendingField: string | null;
  active: boolean;
  lastActivity: string;
  createdAt: string;
  updatedAt: string;
}

export interface BotLead {
  id: string;
  customerId: string;
  propertyId: string;
  status: string;
  source: string;
  notes: string | null;
  createdAt: string;
  customer: { name: string; phone: string; email: string };
  property: { title: string; price: number; city: string };
}

export interface BotSiteVisit {
  id: string;
  customerId: string;
  propertyId: string | null;
  scheduledAt: string;
  status: string;
  notes: string | null;
  customer: { name: string; phone: string };
  property: { title: string; address: string; city: string } | null;
}

export async function getAiBotSummary(): Promise<AiBotSummary> {
  if (env.VITE_MOCK_AUTH) {
    return {
      kpis: [
        { label: "Total Conversations", value: 124, icon: "bot", color: "var(--chart-1)" },
        { label: "Active Sessions", value: 8, icon: "eye", color: "var(--chart-2)" },
        { label: "Leads Generated", value: 42, icon: "trending-up", color: "var(--chart-3)" },
        { label: "Qualified Leads", value: 25, icon: "users", color: "var(--chart-4)" },
        { label: "Site Visits Scheduled", value: 12, icon: "key", color: "var(--chart-5)" },
        { label: "Conversion Rate", value: "33%", icon: "target", color: "var(--chart-1)" },
      ],
      conversionFunnel: [
        { stage: "Conversations", count: 124, percentage: 100 },
        { stage: "Active Sessions", count: 88, percentage: 70 },
        { stage: "Leads Generated", count: 42, percentage: 33 },
        { stage: "Site Visits", count: 12, percentage: 28 },
        { stage: "Closed Won", count: 4, percentage: 9 },
      ],
      topLocations: [
        { name: "Gota", value: 45 },
        { name: "Satellite", value: 28 },
        { name: "Bopal", value: 22 },
        { name: "Chandkheda", value: 18 },
        { name: "Vastral", value: 11 },
      ],
      topPropertyTypes: [
        { name: "Flat", value: 68 },
        { name: "Villa", value: 32 },
        { name: "Plot", value: 24 },
      ],
      chatActivity: [
        { name: "Mon", customer: 15, bot: 15 },
        { name: "Tue", customer: 22, bot: 22 },
        { name: "Wed", customer: 18, bot: 18 },
        { name: "Thu", customer: 25, bot: 26 },
        { name: "Fri", customer: 30, bot: 30 },
        { name: "Sat", customer: 12, bot: 12 },
        { name: "Sun", customer: 8, bot: 8 },
      ],
      averageResponseTime: "0.8m",
    };
  }
  return apiGet<AiBotSummary>("/ai-bot/summary");
}

export async function getAiSessions(): Promise<AiSession[]> {
  if (env.VITE_MOCK_AUTH) {
    return [
      {
        id: "1",
        phone: "919876543210",
        collected: '{"type":"flat","location":"Gota","bedrooms":2,"budget":{"minPrice":null,"maxPrice":50}}',
        pendingField: null,
        active: true,
        lastActivity: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
  }
  return apiGet<AiSession[]>("/ai-bot/sessions");
}

export async function getBotLeads(): Promise<BotLead[]> {
  if (env.VITE_MOCK_AUTH) {
    return [
      {
        id: "lead-1",
        customerId: "cust-1",
        propertyId: "prop-1",
        status: "NEW",
        source: "WhatsApp AI Bot",
        notes: "Interested in 3 BHK flat in Gota",
        createdAt: new Date().toISOString(),
        customer: { name: "Rajesh Patel", phone: "919876543210", email: "rajesh@gmail.com" },
        property: { title: "Premium 3 BHK Apartment", price: 7500000, city: "Ahmedabad" },
      },
    ];
  }
  return apiGet<BotLead[]>("/ai-bot/leads");
}

export async function getBotSiteVisits(): Promise<BotSiteVisit[]> {
  if (env.VITE_MOCK_AUTH) {
    return [
      {
        id: "visit-1",
        customerId: "cust-1",
        propertyId: "prop-1",
        scheduledAt: new Date(Date.now() + 86400000 * 2).toISOString(),
        status: "SCHEDULED",
        notes: "Site visit scheduled via WhatsApp Bot",
        customer: { name: "Rajesh Patel", phone: "919876543210" },
        property: { title: "Premium 3 BHK Apartment", address: "Gota", city: "Ahmedabad" },
      },
    ];
  }
  return apiGet<BotSiteVisit[]>("/ai-bot/visits");
}
