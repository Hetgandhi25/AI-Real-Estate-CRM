import { createFileRoute } from "@tanstack/react-router";
import MessagesPage from "@/features/messages/MessagesPage";
import { authGuard } from "@/lib/auth-guard";
import { ROUTES } from "@/constants/routes";

export const Route = createFileRoute("/messages")({
  head: () => ({ meta: [{ title: "Messages — Ishan Technologies" }] }),
  beforeLoad: () => authGuard({ route: ROUTES.messages }),
  component: MessagesPage,
});

