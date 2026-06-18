import { memo, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid,
  Cell, Legend, Pie, PieChart, Tooltip, XAxis, YAxis,
} from 'recharts';
import { 
  ArrowUpRight, Home, MoreHorizontal, Key, Users, MapPin, 
  TrendingUp, MessageSquare, DollarSign, Eye, Facebook, Instagram, Target
} from 'lucide-react';
import { ChartShell } from '@/components/common/chart-shell';
import { KpiCard } from '@/components/kpi-card';
import { useDashboardSummary, useSession } from '@/hooks';
import { formatCurrency } from '@/lib/formatters';
import { CHART_GRADIENT_IDS, CHART_TOOLTIP_STYLE } from '@/constants/charts';
import { ROUTES } from '@/constants/routes';
import type { LucideIcon } from 'lucide-react';

const iconMap: Record<string, LucideIcon> = {
  home: Home,
  key: Key,
  users: Users,
  map: MapPin,
  "trending-up": TrendingUp,
  bot: MessageSquare,
  "dollar-sign": DollarSign,
  eye: Eye,
  facebook: Facebook,
  instagram: Instagram,
  target: Target,
};

const tickFormatterK = (v: number) => `${v}k`;

function Dashboard() {
  const { data, isLoading } = useDashboardSummary();
  const { displayName } = useSession();
  const [showRevenueModal, setShowRevenueModal] = useState(false);
  const dashboard = data ?? {
    kpis: [],
    revenueData: [],
    referrals: [],
    customerGrowth: [],
    propertyTypes: [],
    topAgents: [],
  };

  const handleExport = () => {
    if (!dashboard) return;

    const payload = {
      exportedAt: new Date().toISOString(),
      summary: {
        kpis: dashboard.kpis,
        revenueData: dashboard.revenueData,
        referrals: dashboard.referrals,
        customerGrowth: dashboard.customerGrowth,
        propertyTypes: dashboard.propertyTypes,
        topAgents: dashboard.topAgents,
      },
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "yandox-dashboard-summary.json";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isLoading ? "Loading analytics..." : `Welcome back, ${displayName}. Here's what's happening today.`}
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <button type="button" className="px-3 py-2 rounded-lg bg-card border border-border">
            Last 30 days
          </button>
          <button
            type="button"
            onClick={handleExport}
            className="px-3 py-2 rounded-lg bg-[image:var(--gradient-primary)] text-primary-foreground font-medium"
          >
            Export
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {dashboard.kpis.map((k) => {
          const isRevenue = k.label === "Revenue (Mo)";
          return (
            <KpiCard
              key={k.label}
              {...k}
              icon={iconMap[k.icon] ?? Home}
              onClick={isRevenue ? () => setShowRevenueModal(true) : undefined}
              className={isRevenue ? "cursor-pointer active:scale-[0.98] transition-transform hover:shadow-lg" : undefined}
            />
          );
        })}
      </div>

      <Dialog open={showRevenueModal} onOpenChange={setShowRevenueModal}>
        <DialogContent className="max-w-md bg-card/95 border-border backdrop-blur-xl text-foreground">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <DollarSign className="size-5 text-[color:var(--chart-2)]" />
              Monthly Revenue Breakdown
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-sm">
              Attributed income details across properties for the current month.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-3 max-h-[350px] overflow-y-auto pr-1">
            {dashboard.revenueBreakdown && dashboard.revenueBreakdown.length > 0 ? (
              dashboard.revenueBreakdown.map((item) => (
                <div 
                  key={item.propertyId} 
                  className="flex items-center justify-between p-3.5 rounded-xl bg-accent/20 hover:bg-accent/40 border border-border/50 transition-colors"
                >
                  <div className="min-w-0 pr-3">
                    <h4 className="font-semibold text-sm truncate">{item.title}</h4>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{item.address}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-bold text-sm text-[color:var(--chart-2)]">
                      {formatCurrency(item.income)}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No breakdown data available for this month.</p>
            )}
          </div>
          <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-sm">
            <span className="font-semibold text-muted-foreground">Total Income</span>
            <span className="font-bold text-lg text-foreground">
              {formatCurrency(
                dashboard.revenueBreakdown?.reduce((sum, item) => sum + item.income, 0) || 0
              )}
            </span>
          </div>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="glass-card rounded-2xl p-6 lg:col-span-2">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold">Total Revenue</h3>
              <div className="flex items-baseline gap-3 mt-2">
                <span className="text-4xl font-bold tabular-nums">
                  {dashboard.revenueData.length ? formatCurrency(dashboard.revenueData.at(-1)?.current ?? 0) : "--"}
                </span>
                <span className="inline-flex items-center gap-1 text-xs text-[color:var(--success)] font-medium">
                  <ArrowUpRight className="size-3" aria-hidden /> 0.8% than last month
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-[color:var(--chart-1)]" aria-hidden />
                Last Month
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-[color:var(--chart-1)]/40" aria-hidden />
                Running
              </span>
              <MoreHorizontal className="size-4 text-muted-foreground" aria-hidden />
            </div>
          </div>
          <div className="h-72">
            <ChartShell>
              <BarChart data={dashboard.revenueData} barGap={6}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="oklch(0.28 0.015 260)"
                  vertical={false}
                />
                <XAxis
                  dataKey="name"
                  stroke="oklch(0.66 0.02 260)"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="oklch(0.66 0.02 260)"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={tickFormatterK}
                />
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                <Bar dataKey="last" fill="var(--chart-1)" radius={[8, 8, 0, 0]} />
                <Bar dataKey="current" fill="oklch(0.68 0.19 275 / 0.35)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ChartShell>
          </div>
        </div>

        <ReferralsPanel referrals={dashboard.referrals} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ConversionPanel conversions={dashboard.conversions || []} />
        <CustomerGrowthChart points={dashboard.customerGrowth} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PropertyTypesChart types={dashboard.propertyTypes} />
        <TopAgentsPanel agents={dashboard.topAgents} />
      </div>
    </div>
  );
}

const ReferralsPanel = memo(function ReferralsPanel({ referrals }: { referrals: { label: string; value: number; color: string }[] }) {
  return (
    <div className="glass-card rounded-2xl p-6">
      <h3 className="text-lg font-semibold">Property Referrals</h3>
      <div className="mt-5 space-y-5">
        {referrals.map((r) => (
          <div key={r.label}>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{r.label}</span>
              <span className="font-semibold tabular-nums">{r.value}%</span>
            </div>
            <div className="mt-2 h-1.5 rounded-full bg-secondary overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{ width: `${r.value}%`, background: r.color }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

const ConversionPanel = memo(function ConversionPanel({ conversions }: { conversions: { label: string; value: number; color: string; won: number; total: number }[] }) {
  return (
    <div className="glass-card rounded-2xl p-6">
      <h3 className="text-lg font-semibold">Conversion Rate by Lead Source</h3>
      <div className="mt-5 space-y-5">
        {conversions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No conversion data available.</p>
        ) : (
          conversions.map((c) => (
            <div key={c.label}>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{c.label}</span>
                <span className="font-semibold tabular-nums">
                  {c.value}% <span className="text-xs text-muted-foreground font-normal">({c.won}/{c.total} won)</span>
                </span>
              </div>
              <div className="mt-2 h-1.5 rounded-full bg-secondary overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${c.value}%`, background: c.color }}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
});

const CustomerGrowthChart = memo(function CustomerGrowthChart({ points }: { points: { name: string; users: number }[] }) {
  const gradientId = CHART_GRADIENT_IDS.customerGrowth;

  return (
    <div className="glass-card rounded-2xl p-6">
      <h3 className="text-lg font-semibold">Customer Growth</h3>
      <p className="text-xs text-muted-foreground">New users this week</p>
      <div className="h-56 mt-3">
        <ChartShell>
          <AreaChart data={points}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.5} />
                <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="oklch(0.28 0.015 260)"
              vertical={false}
            />
            <XAxis
              dataKey="name"
              stroke="oklch(0.66 0.02 260)"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="oklch(0.66 0.02 260)"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
            <Area
              type="monotone"
              dataKey="users"
              stroke="var(--chart-1)"
              strokeWidth={2}
              fill={`url(#${gradientId})`}
            />
          </AreaChart>
        </ChartShell>
      </div>
    </div>
  );
});

const PropertyTypesChart = memo(function PropertyTypesChart({ types }: { types: { name: string; value: number }[] }) {
  return (
    <div className="glass-card rounded-2xl p-6">
      <h3 className="text-lg font-semibold">Property Types</h3>
      <p className="text-xs text-muted-foreground">Distribution by category</p>
      <div className="h-56 mt-3">
        <ChartShell>
          <PieChart>
            <Pie
              data={types}
              dataKey="value"
              nameKey="name"
              innerRadius={45}
              outerRadius={75}
              paddingAngle={4}
            >
              {types.map((_, i) => (
                <Cell key={i} fill={`var(--chart-${(i % 5) + 1})`} stroke="transparent" />
              ))}
            </Pie>
            <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
            <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
          </PieChart>
        </ChartShell>
      </div>
    </div>
  );
});

const TopAgentsPanel = memo(function TopAgentsPanel({ agents }: { agents: { name: string; role: string; sales: number; avatar: string }[] }) {
  const navigate = useNavigate();

  return (
    <div className="glass-card rounded-2xl p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Top Agents</h3>
        <button
          type="button"
          onClick={() => navigate({ to: ROUTES.agents })}
          className="text-xs text-primary font-medium"
        >
          View all
        </button>
      </div>
      <ul className="mt-4 space-y-3">
        {agents.map((a) => (
          <li
            key={a.name}
            className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-accent/40 transition-colors"
          >
            <div className="size-10 rounded-xl bg-[image:var(--gradient-primary)] grid place-items-center text-sm font-semibold">
              {a.avatar}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{a.name}</p>
              <p className="text-xs text-muted-foreground">{a.role}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold tabular-nums">{a.sales}</p>
              <p className="text-[10px] text-muted-foreground">sales</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
});

export default Dashboard;
