/** Stable Recharts tooltip styles (shared reference, no per-render object identity issues). */
export const CHART_TOOLTIP_STYLE = {
  background: "oklch(0.22 0.015 260)",
  border: "1px solid oklch(0.28 0.015 260)",
  borderRadius: 12,
} as const;

export const CHART_GRADIENT_IDS = {
  customerGrowth: "yandox-customer-growth-fill",
} as const;
