/**
 * SSR-safe formatters — deterministic on server and client.
 * Integer grouping uses pure JS (no ICU/locale variance between Node and browsers).
 */
export const FORMAT_LOCALE = "en-US" as const;

/** US-style thousands separators without Intl (100% SSR-stable). */
function formatIntegerWithCommas(value: number): string {
  const negative = value < 0;
  const digits = Math.abs(Math.trunc(value)).toString();
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return negative ? `-${grouped}` : grouped;
}

const compactNumberFormatter = new Intl.NumberFormat(FORMAT_LOCALE, {
  notation: "compact",
  maximumFractionDigits: 1,
});

const dateFormatter = new Intl.DateTimeFormat(FORMAT_LOCALE, {
  year: "numeric",
  month: "short",
  day: "numeric",
});

const monthShortFormatter = new Intl.DateTimeFormat(FORMAT_LOCALE, { month: "short" });

function toDate(value: Date | string | number): Date {
  return value instanceof Date ? value : new Date(value);
}

/** 236535 → "236,535" */
export function formatNumber(value: number): string {
  return formatIntegerWithCommas(value);
}

/** 236535 → "$236,535" */
export function formatCurrency(value: number, currency = "USD"): string {
  if (currency === "USD") {
    return `$${formatNumber(value)}`;
  }
  return new Intl.NumberFormat(FORMAT_LOCALE, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

/** 236535 → "236.5K" */
export function formatCompactNumber(value: number): string {
  return compactNumberFormatter.format(value);
}

/** Date → "May 22, 2026" */
export function formatDate(value: Date | string | number): string {
  return dateFormatter.format(toDate(value));
}

/** Date → "May" */
export function formatMonthShort(value: Date | string | number): string {
  return monthShortFormatter.format(toDate(value));
}

/** "$" + grouped number */
export function formatPrice(value: number): string {
  return `$${formatNumber(value)}`;
}
