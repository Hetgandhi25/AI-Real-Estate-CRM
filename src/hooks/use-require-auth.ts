import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { env } from "@/config";
import { AUTH_ROUTES } from "@/constants";
import { useAuth } from "@/hooks/use-auth";

/** Redirects unauthenticated users to login when mock auth is disabled. */
export function useRequireAuth(redirectTo = AUTH_ROUTES.login) {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (env.VITE_MOCK_AUTH || isLoading) return;
    if (!isAuthenticated) {
      void navigate({ to: redirectTo });
    }
  }, [isAuthenticated, isLoading, navigate, redirectTo]);

  return { isAuthenticated, isLoading, isEnforced: !env.VITE_MOCK_AUTH };
}
