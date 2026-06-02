import { createFileRoute } from "@tanstack/react-router";
import AiBotPage from "@/features/ai-bot/AiBotPage";
import { authGuard } from "@/lib/auth-guard";
import { ROUTES } from "@/constants/routes";

export const Route = createFileRoute("/ai-bot")({
  head: () => ({ meta: [{ title: "AI Bot — Ishan Technologies" }] }),
  beforeLoad: () => authGuard({ route: ROUTES.aiBot }),
  component: AiBotPage,
});

