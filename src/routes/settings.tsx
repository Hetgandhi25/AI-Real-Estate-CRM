import { createFileRoute } from "@tanstack/react-router";
import SettingsPage from "@/features/settings/SettingsPage";
import { authGuard } from "@/lib/auth-guard";
import { ROUTES } from "@/constants/routes";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings — Ishan Technologies" }] }),
  beforeLoad: () => authGuard({ route: ROUTES.settings }),
  component: SettingsPage,
});

