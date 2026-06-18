import { memo } from "react";
import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";
import { RadialBarChart, RadialBar, ResponsiveContainer, PolarAngleAxis } from "recharts";
import { ClientOnly } from "@/components/common/client-only";
import { formatCurrency, formatNumber } from "@/lib/formatters";

import { cn } from "@/lib/utils";

type KpiCardProps = {
  label: string;
  value: number | string;
  change: number;
  color: string;
  icon: LucideIcon;
  prefix?: string;
  onClick?: () => void;
  className?: string;
};

function KpiCardComponent({ label, value, change, color, icon: Icon, prefix, onClick, className }: KpiCardProps) {
  const pct = Math.min(Math.abs(change) * 4 + 30, 95);
  const data = [{ name: "v", value: pct, fill: color }];
  const positive = change >= 0;

  const displayValue =
    typeof value === "number"
      ? prefix === "$"
        ? formatCurrency(value)
        : `${prefix ?? ""}${formatNumber(value)}`
      : `${prefix ?? ""}${value}`;

  return (
    <div
      onClick={onClick}
      className={cn(
        "glass-card rounded-2xl p-5 hover:-translate-y-0.5 hover:border-primary/40 transition-all duration-300 group",
        className
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Icon className="size-4" aria-hidden />
            <span className="truncate">{label}</span>
          </div>
          <div className="mt-3 text-3xl font-bold tracking-tight tabular-nums">{displayValue}</div>
          <div
            className={`mt-2 inline-flex items-center gap-1 text-xs font-medium ${positive ? "text-[color:var(--success)]" : "text-destructive"}`}
          >
            {positive ? (
              <ArrowUpRight className="size-3" aria-hidden />
            ) : (
              <ArrowDownRight className="size-3" aria-hidden />
            )}
            {Math.abs(change)}% vs last month
          </div>
        </div>
        <div className="size-16 shrink-0" aria-hidden>
          <ClientOnly fallback={<div className="size-16" />}>
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart
                innerRadius="70%"
                outerRadius="100%"
                data={data}
                startAngle={90}
                endAngle={-270}
              >
                <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                <RadialBar
                  dataKey="value"
                  cornerRadius={10}
                  background={{ fill: "oklch(0.28 0.015 260)" }}
                />
              </RadialBarChart>
            </ResponsiveContainer>
          </ClientOnly>
        </div>
      </div>
    </div>
  );
}

export const KpiCard = memo(KpiCardComponent);
