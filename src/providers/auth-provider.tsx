import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { env } from "@/config";
import { getInitialAuthState } from "@/lib/auth-initial-state";
import { authService } from "@/services";
import type { AuthSession, AuthUser, LoginCredentials } from "@/types";
import type { UserRole } from "@/types/auth";

export type AuthContextValue = {
  user: AuthUser | null;
  session: AuthSession | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  hasRole: (role: UserRole | UserRole[]) => boolean;
  refreshSession: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

type AuthProviderProps = {
  children: ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
  const initial = getInitialAuthState();
  const [session, setSession] = useState<AuthSession | null>(initial.session);
  const [isLoading, setIsLoading] = useState(initial.isLoading);

  const refreshSession = useCallback(async () => {
    const next = await authService.getSession();
    setSession(next);
  }, []);

  useEffect(() => {
    if (env.VITE_MOCK_AUTH) return;

    let mounted = true;
    // Add a timeout fallback so the app never remains loading indefinitely
    const timeout = setTimeout(() => {
      if (mounted) setIsLoading(false);
    }, 5000);

    (async () => {
      try {
        const next = await authService.getSession();
        if (mounted) setSession(next);
      } catch (err) {
        // swallow - getSession handles clearing tokens and failures
      } finally {
        if (mounted) {
          clearTimeout(timeout);
          setIsLoading(false);
        }
      }
    })();
    return () => {
      mounted = false;
      clearTimeout(timeout);
    };
  }, []);

  const login = useCallback(async (credentials: LoginCredentials) => {
    const next = await authService.login(credentials);
    setSession(next);
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    setSession(null);
  }, []);

  const hasRole = useCallback(
    (role: UserRole | UserRole[]) => {
      if (!session?.user) return false;
      const roles = Array.isArray(role) ? role : [role];
      return roles.includes(session.user.role);
    },
    [session],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      session,
      isAuthenticated: Boolean(session?.user),
      isLoading,
      login,
      logout,
      hasRole,
      refreshSession,
    }),
    [session, isLoading, login, logout, hasRole, refreshSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
