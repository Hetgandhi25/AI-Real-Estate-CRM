import { redirect } from "@tanstack/react-router";
import { env } from "@/config";
import { AUTH_ROUTES, ROUTE_ROLES, type AppRoute } from "@/constants";
import { authService } from "@/services";
import type { UserRole } from "@/types";

export type AuthGuardOptions = {
  /** Route path used for role lookup in ROUTE_ROLES. */
  route?: AppRoute;
  /** Explicit roles; overrides ROUTE_ROLES when set. */
  roles?: UserRole[];
  redirectTo?: string;
};

/**
 * TanStack Router `beforeLoad` helper — opt-in per route.
 * No-op when VITE_MOCK_AUTH=true so existing UI keeps working.
 */
export async function authGuard(options: AuthGuardOptions = {}) {
  if (env.VITE_MOCK_AUTH) return;

  const session = await authService.getSession();
  if (!session) {
    throw redirect({ to: options.redirectTo ?? AUTH_ROUTES.login });
  }

  const requiredRoles = options.roles ?? (options.route ? ROUTE_ROLES[options.route] : undefined);

  if (requiredRoles?.length && !requiredRoles.includes(session.user.role)) {
    throw redirect({ to: AUTH_ROUTES.unauthorized });
  }

  return { session };
}
