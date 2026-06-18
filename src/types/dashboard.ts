export type KpiItem = {
  label: string;
  value: number;
  change: number;
  color: string;
  icon: string;
  prefix?: string;
};

export type RevenuePoint = {
  name: string;
  last: number;
  current: number;
};

export type ReferralItem = {
  label: string;
  value: number;
  color: string;
};

export type GrowthPoint = {
  name: string;
  users: number;
};

export type PropertyTypeSlice = {
  name: string;
  value: number;
};

export type TopAgent = {
  name: string;
  role: string;
  sales: number;
  avatar: string;
};

export type ConversionItem = {
  label: string;
  value: number;
  color: string;
  won: number;
  total: number;
};

export type RevenueBreakdownItem = {
  propertyId: string;
  title: string;
  address: string;
  income: number;
};

export type DashboardSummary = {
  kpis: KpiItem[];
  revenueData: RevenuePoint[];
  referrals: ReferralItem[];
  customerGrowth: GrowthPoint[];
  propertyTypes: PropertyTypeSlice[];
  topAgents: TopAgent[];
  conversions?: ConversionItem[];
  revenueBreakdown?: RevenueBreakdownItem[];
};

// ── Analytics ────────────────────────────────────────────────────────────────
export type LeadFunnelItem = {
  status: string;
  count: number;
};

export type AgentPerformanceItem = {
  name: string;
  score: number;
  experience: number;
};

export type AppointmentTrendItem = {
  status: string;
  count: number;
};

export type RevenueMontlyItem = {
  name: string;
  revenue: number;
  prev: number;
};

export type AnalyticsSummary = {
  leadFunnel: LeadFunnelItem[];
  agentPerformance: AgentPerformanceItem[];
  appointmentTrends: AppointmentTrendItem[];
  revenueMonthly: RevenueMontlyItem[];
  newCustomers: number;
  totalCustomers: number;
};
