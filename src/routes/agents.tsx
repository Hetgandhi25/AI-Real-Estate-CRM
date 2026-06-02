import { createFileRoute } from "@tanstack/react-router";
import AgentsPage from "@/features/agents/AgentsPage";
import { authGuard } from "@/lib/auth-guard";
import { ROUTES } from "@/constants/routes";

export const Route = createFileRoute("/agents")({
  head: () => ({ meta: [{ title: "Agents — Ishan Technologies" }] }),
  beforeLoad: () => authGuard({ route: ROUTES.agents }),
  component: AgentsPage,
});

