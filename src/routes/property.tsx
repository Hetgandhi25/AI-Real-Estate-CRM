import { createFileRoute } from "@tanstack/react-router";
import PropertyPage from "@/features/property/PropertyPage";
import { authGuard } from "@/lib/auth-guard";
import { ROUTES } from "@/constants/routes";

export const Route = createFileRoute("/property")({
  head: () => ({ meta: [{ title: "Properties — Ishan Technologies" }] }),
  beforeLoad: () => authGuard({ route: ROUTES.property }),
  component: PropertyPage,
});


