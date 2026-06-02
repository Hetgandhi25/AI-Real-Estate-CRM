import { API_ENDPOINTS, apiGet } from "@/api";
import { env } from "@/config";
import {
  customerGrowth,
  kpis,
  propertyTypes,
  referrals,
  revenueData,
  topAgents,
  conversions,
} from "@/lib/mock-data";
import type { DashboardSummary, AnalyticsSummary } from "@/types";

export async function getDashboardSummary(): Promise<DashboardSummary> {
  if (env.VITE_MOCK_AUTH) {
    return { kpis, revenueData, referrals, customerGrowth, propertyTypes, topAgents, conversions };
  }
  return apiGet<DashboardSummary>(API_ENDPOINTS.dashboard.summary);
}

export async function getAnalyticsSummary(): Promise<AnalyticsSummary> {
  if (env.VITE_MOCK_AUTH) {
    return {
      leadFunnel: [
        { status: "NEW", count: 12 },
        { status: "CONTACTED", count: 28 },
        { status: "QUALIFIED", count: 18 },
        { status: "WON", count: 9 },
        { status: "LOST", count: 5 },
      ],
      agentPerformance: [
        { name: "Sarah Mitchell", score: 91.5, experience: 7 },
        { name: "Priya Sharma", score: 96.1, experience: 9 },
        { name: "James Harrington", score: 85.2, experience: 4 },
      ],
      appointmentTrends: [
        { status: "SCHEDULED", count: 8 },
        { status: "CONFIRMED", count: 5 },
        { status: "COMPLETED", count: 12 },
        { status: "CANCELLED", count: 2 },
      ],
      revenueMonthly: revenueData.map((r, i) => ({ name: r.name, revenue: r.current, prev: r.last })),
      newCustomers: 14,
      totalCustomers: 58,
    };
  }
  return apiGet<AnalyticsSummary>(API_ENDPOINTS.dashboard.analytics);
}
