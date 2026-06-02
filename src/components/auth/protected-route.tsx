import type { ReactNode } from "react";
import { env } from "@/config";
import { PageSkeleton } from "@/components/common/page-skeleton";
import { useAuth } from "@/hooks/use-auth";
import { useRequireAuth } from "@/hooks/use-require-auth";
import type { UserRole } from "@/types";

export type ProtectedRouteProps = {
  children: ReactNode;
  roles?: UserRole[];
  fallback?: ReactNode;
};

/**
 * Client-side route guard wrapper.
 * With VITE_MOCK_AUTH=true (default in dev), always renders children.
 */
export function ProtectedRoute({ children, roles, fallback }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, hasRole } = useAuth();
  useRequireAuth();

  if (env.VITE_MOCK_AUTH) return <>{children}</>;

  if (isLoading) return fallback ?? <PageSkeleton />;

  if (!isAuthenticated) return fallback ?? <PageSkeleton />;

  if (roles?.length && !hasRole(roles)) {
    return (
      <div className="glass-card rounded-2xl p-12 text-center">
        <p className="font-semibold">Access denied</p>
        <p className="mt-2 text-sm text-muted-foreground">
          You do not have permission to view this page.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
