import { createFileRoute } from "@tanstack/react-router";
import CalendarPage from "@/features/calendar/CalendarPage";
import { authGuard } from "@/lib/auth-guard";
import { ROUTES } from "@/constants/routes";

export const Route = createFileRoute("/calendar")({
  head: () => ({ meta: [{ title: "Calendar — Ishan Technologies" }] }),
  beforeLoad: () => authGuard({ route: ROUTES.calendar }),
  component: CalendarPage,
});

