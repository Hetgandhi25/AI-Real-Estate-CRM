import { createFileRoute } from "@tanstack/react-router";
import DashboardPage from "@/features/dashboard/DashboardPage";
import { authGuard } from "@/lib/auth-guard";
import { ROUTES } from "@/constants/routes";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Dashboard — Ishan Technologies" }] }),
  beforeLoad: () => authGuard({ route: ROUTES.dashboard }),
  component: DashboardPage,
});

