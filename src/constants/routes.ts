export const ROUTES = {
  dashboard: "/",
  property: "/property",
  customers: "/customers",
  agents: "/agents",
  analytics: "/analytics",
  aiBot: "/ai-bot",
  reviews: "/reviews",
  messages: "/messages",
  calendar: "/calendar",
  leads: "/leads",
  settings: "/settings",
  login: "/login",
  unauthorized: "/unauthorized",
} as const;

export type AppRoute = (typeof ROUTES)[keyof typeof ROUTES];

/** Routes that require authentication when mock auth is disabled. */
export const PROTECTED_ROUTES: AppRoute[] = [
  ROUTES.dashboard,
  ROUTES.property,
  ROUTES.customers,
  ROUTES.agents,
  ROUTES.analytics,
  ROUTES.aiBot,
  ROUTES.reviews,
  ROUTES.messages,
  ROUTES.leads,
  ROUTES.calendar,
  ROUTES.settings,
];

/** Minimum role required per route (optional RBAC). */
export const ROUTE_ROLES: Partial<Record<AppRoute, Array<"admin" | "manager" | "agent">>> = {
  [ROUTES.settings]: ["admin", "manager"],
  [ROUTES.agents]: ["admin", "manager"],
  [ROUTES.analytics]: ["admin", "manager"],
};
