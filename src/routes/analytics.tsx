import { createFileRoute } from "@tanstack/react-router";
import AnalyticsPage from "@/features/analytics/AnalyticsPage";
import { authGuard } from "@/lib/auth-guard";
import { ROUTES } from "@/constants/routes";

export const Route = createFileRoute("/analytics")({
  head: () => ({ meta: [{ title: "Analytics — Ishan Technologies" }] }),
  beforeLoad: () => authGuard({ route: ROUTES.analytics }),
  component: AnalyticsPage,
});

