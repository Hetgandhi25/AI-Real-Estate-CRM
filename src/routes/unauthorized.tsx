import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/unauthorized")({
  head: () => ({ meta: [{ title: "Unauthorized — Ishan Technologies" }] }),
  component: UnauthorizedPage,
});

function UnauthorizedPage() {
  return (
    <div className="glass-card mx-auto max-w-md rounded-2xl p-12 text-center">
      <h1 className="text-2xl font-bold">Access denied</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        You do not have permission to view this resource.
      </p>
      <Link
        to="/"
        className="mt-6 inline-flex rounded-xl bg-[image:var(--gradient-primary)] px-4 py-2 text-sm font-medium text-primary-foreground"
      >
        Go to dashboard
      </Link>
    </div>
  );
}
