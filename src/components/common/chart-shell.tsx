import type { ReactElement } from "react";
import { ResponsiveContainer } from "recharts";
import { ClientOnly } from "@/components/common/client-only";

type ChartShellProps = {
  className?: string;
  children: ReactElement;
};

/**
 * Gates Recharts behind client mount — avoids ResponsiveContainer SSR dimension mismatches.
 */
export function ChartShell({ className = "h-full w-full", children }: ChartShellProps) {
  return (
    <ClientOnly fallback={<div className={className} aria-hidden />}>
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </ClientOnly>
  );
}
