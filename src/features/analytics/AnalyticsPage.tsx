import React from 'react';
import { Target, TrendingUp, Users, Award, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  Legend, Tooltip, CartesianGrid, XAxis, YAxis,
} from 'recharts';
import { ChartShell } from '@/components/common/chart-shell';
import { useAnalyticsSummary } from '@/hooks';
import { formatCurrency } from '@/lib/formatters';
import { CHART_TOOLTIP_STYLE } from '@/constants/charts';

const STATUS_COLORS: Record<string, string> = {
  NEW: 'var(--chart-1)',
  CONTACTED: 'var(--chart-2)',
  QUALIFIED: 'var(--chart-3)',
  NEGOTIATING: 'var(--chart-4)',
  WON: 'var(--chart-5)',
  LOST: 'oklch(0.55 0.2 25)',
  SCHEDULED: 'var(--chart-1)',
  COMPLETED: 'var(--chart-3)',
  CANCELLED: 'oklch(0.55 0.2 25)',
  RESCHEDULED: 'var(--chart-2)',
};

function AnalyticsPage() {
  const { data, isLoading } = useAnalyticsSummary();

  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="text-sm text-muted-foreground mt-1">Loading analytics data…</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="glass-card rounded-2xl p-6 animate-pulse space-y-3">
              <div className="h-3 bg-muted rounded w-1/2" />
              <div className="h-8 bg-muted rounded w-2/3" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const totalLeads = data.leadFunnel.reduce((a, c) => a + c.count, 0);
  const wonLeads = data.leadFunnel.find((f) => f.status === "WON")?.count ?? 0;
  const conversionRate = totalLeads > 0 ? ((wonLeads / totalLeads) * 100).toFixed(1) : "0";
  const latestRevenue = data.revenueMonthly.at(-1)?.revenue ?? 0;
  const prevRevenue = data.revenueMonthly.at(-2)?.revenue ?? 0;
  const revenueChange = prevRevenue > 0 ? (((latestRevenue - prevRevenue) / prevRevenue) * 100).toFixed(1) : "0";
  const isRevenueUp = latestRevenue >= prevRevenue;

  const topAgent = [...(data.agentPerformance)].sort((a, b) => b.score - a.score)[0];
  const customerGrowthRate = data.totalCustomers > 0
    ? ((data.newCustomers / data.totalCustomers) * 100).toFixed(1)
    : "0";

  const summaryKpis = [
    {
      label: "Lead Conversion",
      value: `${conversionRate}%`,
      sub: `${wonLeads} of ${totalLeads} leads`,
      icon: Target,
      up: true,
    },
    {
      label: "Monthly Revenue",
      value: formatCurrency(latestRevenue),
      sub: `${isRevenueUp ? "↑" : "↓"} ${Math.abs(Number(revenueChange))}% vs last month`,
      icon: TrendingUp,
      up: isRevenueUp,
    },
    {
      label: "Customer Growth",
      value: `+${data.newCustomers}`,
      sub: `${customerGrowthRate}% of ${data.totalCustomers} total`,
      icon: Users,
      up: true,
    },
    {
      label: "Top Agent",
      value: topAgent?.name?.split(" ")[0] ?? "—",
      sub: `Score: ${topAgent?.score ?? 0}`,
      icon: Award,
      up: true,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Deep performance metrics, funnels, and trends across the platform.
          </p>
        </div>
      </div>

      {/* KPI Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryKpis.map(({ label, value, sub, icon: Icon, up }) => (
          <div key={label} className="glass-card rounded-2xl p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="size-10 rounded-xl bg-primary/10 grid place-items-center">
                <Icon className="size-5 text-primary" />
              </div>
              <span className={`inline-flex items-center gap-1 text-xs font-medium ${up ? "text-emerald-400" : "text-red-400"}`}>
                {up ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}
                {up ? "Positive" : "Needs attention"}
              </span>
            </div>
            <div>
              <p className="text-2xl font-bold tabular-nums">{value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
              <p className="text-[10px] text-muted-foreground/70 mt-1">{sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Row 1: Revenue trend + Lead Funnel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Trend */}
        <div className="glass-card rounded-2xl p-6 lg:col-span-2">
          <div className="mb-4">
            <h3 className="text-lg font-semibold">Revenue Trend</h3>
            <p className="text-sm text-muted-foreground">6-month revenue comparison (current vs. prior month)</p>
          </div>
          <div className="h-64">
            <ChartShell>
              <AreaChart data={data.revenueMonthly}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="prevGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--chart-2)" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="var(--chart-2)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.28 0.015 260)" vertical={false} />
                <XAxis dataKey="name" stroke="oklch(0.66 0.02 260)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="oklch(0.66 0.02 260)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(v: number) => formatCurrency(v)} />
                <Area type="monotone" dataKey="revenue" stroke="var(--chart-1)" fill="url(#revGrad)" strokeWidth={2} name="This Period" />
                <Area type="monotone" dataKey="prev" stroke="var(--chart-2)" fill="url(#prevGrad)" strokeWidth={2} strokeDasharray="5 5" name="Prior Period" />
              </AreaChart>
            </ChartShell>
          </div>
        </div>

        {/* Appointment Status Breakdown */}
        <div className="glass-card rounded-2xl p-6">
          <h3 className="text-lg font-semibold">Appointment Status</h3>
          <p className="text-xs text-muted-foreground">Distribution of all appointments</p>
          <div className="h-64 mt-4">
            <ChartShell>
              <PieChart>
                <Pie
                  data={data.appointmentTrends}
                  dataKey="count"
                  nameKey="status"
                  innerRadius={50}
                  outerRadius={85}
                  paddingAngle={4}
                >
                  {data.appointmentTrends.map((item) => (
                    <Cell key={item.status} fill={STATUS_COLORS[item.status] ?? "var(--chart-1)"} stroke="transparent" />
                  ))}
                </Pie>
                <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
              </PieChart>
            </ChartShell>
          </div>
        </div>
      </div>

      {/* Row 2: Lead Funnel + Agent Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lead Conversion Funnel */}
        <div className="glass-card rounded-2xl p-6">
          <h3 className="text-lg font-semibold">Lead Conversion Funnel</h3>
          <p className="text-sm text-muted-foreground">Lead count by stage in the pipeline</p>
          <div className="h-64 mt-4">
            <ChartShell>
              <BarChart data={data.leadFunnel} layout="vertical" barSize={20}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.28 0.015 260)" horizontal={false} />
                <XAxis type="number" stroke="oklch(0.66 0.02 260)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="status" stroke="oklch(0.66 0.02 260)" fontSize={12} tickLine={false} axisLine={false} width={80} />
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                <Bar dataKey="count" radius={[0, 8, 8, 0]} name="Leads">
                  {data.leadFunnel.map((item) => (
                    <Cell key={item.status} fill={STATUS_COLORS[item.status] ?? "var(--chart-1)"} />
                  ))}
                </Bar>
              </BarChart>
            </ChartShell>
          </div>
        </div>

        {/* Agent Performance */}
        <div className="glass-card rounded-2xl p-6">
          <h3 className="text-lg font-semibold">Agent Performance</h3>
          <p className="text-sm text-muted-foreground">Performance score by agent</p>
          <div className="h-64 mt-4">
            <ChartShell>
              <BarChart data={data.agentPerformance} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.28 0.015 260)" vertical={false} />
                <XAxis dataKey="name" stroke="oklch(0.66 0.02 260)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => v.split(" ")[0]} />
                <YAxis stroke="oklch(0.66 0.02 260)" fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} />
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(v: number, name: string) => [v, name === "score" ? "Performance Score" : "Years Experience"]} />
                <Bar dataKey="score" name="score" radius={[8, 8, 0, 0]}>
                  {data.agentPerformance.map((_, index) => (
                    <Cell key={index} fill={`var(--chart-${(index % 5) + 1})`} />
                  ))}
                </Bar>
              </BarChart>
            </ChartShell>
          </div>

          {/* Agent leaderboard */}
          <div className="mt-4 space-y-2">
            {[...data.agentPerformance].sort((a, b) => b.score - a.score).slice(0, 3).map((agent, i) => (
              <div key={agent.name} className="flex items-center gap-3 p-2 rounded-xl hover:bg-accent/40">
                <span className={`size-6 rounded-full grid place-items-center text-[10px] font-bold ${i === 0 ? "bg-amber-400/20 text-amber-400" : i === 1 ? "bg-zinc-400/20 text-zinc-400" : "bg-orange-700/20 text-orange-700"}`}>
                  {i + 1}
                </span>
                <span className="flex-1 text-sm font-medium">{agent.name}</span>
                <div className="text-right">
                  <span className="text-sm font-semibold tabular-nums">{agent.score.toFixed(1)}</span>
                  <span className="text-xs text-muted-foreground ml-1">pts</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AnalyticsPage;