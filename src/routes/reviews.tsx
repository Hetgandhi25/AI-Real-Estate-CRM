import { createFileRoute } from "@tanstack/react-router";
import ReviewsPage from "@/features/reviews/ReviewsPage";
import { authGuard } from "@/lib/auth-guard";
import { ROUTES } from "@/constants/routes";

export const Route = createFileRoute("/reviews")({
  head: () => ({ meta: [{ title: "Reviews — Ishan Technologies" }] }),
  beforeLoad: () => authGuard({ route: ROUTES.reviews }),
  component: ReviewsPage,
});

