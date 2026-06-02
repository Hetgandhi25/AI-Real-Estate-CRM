/** Default TanStack Query timings (milliseconds). */
export const QUERY_DEFAULTS = {
  staleTime: 60_000,
  gcTime: 5 * 60_000,
  retry: 1,
  refetchOnWindowFocus: import.meta.env.PROD,
} as const;

export const QUERY_STALE = {
  dashboard: 60_000,
  properties: 30_000,
  propertyDetail: 60_000,
  auth: 0,
  customers: 30_000,
  leads: 30_000,
  agents: 30_000,
  appointments: 30_000,
  conversations: 30_000,
  reviews: 30_000,
} as const;
