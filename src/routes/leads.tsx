import { createFileRoute } from "@tanstack/react-router";
import LeadsPage from "@/features/leads/LeadsPage";
import { authGuard } from "@/lib/auth-guard";
import { ROUTES } from "@/constants/routes";

export const Route = createFileRoute("/leads")({
  head: () => ({ meta: [{ title: "Leads — Ishan Technologies" }] }),
  beforeLoad: () => authGuard({ route: ROUTES.leads }),
  component: LeadsPage,
});