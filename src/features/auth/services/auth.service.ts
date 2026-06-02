import { API_ENDPOINTS, apiGet, apiPost, apiPut } from "@/api";
import { env } from "@/config";
import { MOCK_SESSION } from "@/constants";
import { authStore } from "@/store";
import type { AuthSession, AuthUser, LoginCredentials } from "@/types";

/** Resolves current session — mock in dev, API when backend is ready. */
export async function getSession(): Promise<AuthSession | null> {
  if (env.VITE_MOCK_AUTH) {
    return {
      accessToken: MOCK_SESSION.accessToken,
      refreshToken: MOCK_SESSION.refreshToken,
      user: { ...MOCK_SESSION.user },
    };
  }

  const tokens = authStore.getTokens();

  if (!tokens) {
    return null;
  }

  try {
    const user = await apiGet<AuthUser>(API_ENDPOINTS.auth.me);
    return { ...tokens, user };
  } catch {
    authStore.clearTokens();
    return null;
  }
}

export async function login(credentials: LoginCredentials): Promise<AuthSession> {
  if (env.VITE_MOCK_AUTH) {
    const session: AuthSession = {
      accessToken: MOCK_SESSION.accessToken,
      refreshToken: MOCK_SESSION.refreshToken,
      user: { ...MOCK_SESSION.user, email: credentials.email },
    };
    authStore.setTokens(session);
    return session;
  }

  const response = await apiPost<AuthSession, LoginCredentials>(
    API_ENDPOINTS.auth.login,
    credentials,
  );

  const session: AuthSession = {
    accessToken: response.accessToken,
    refreshToken: response.refreshToken,
    user: response.user,
  };

  authStore.setTokens(session);

  return session;
}

export async function logout(): Promise<void> {
  if (!env.VITE_MOCK_AUTH) {
    try {
      await apiPost<void>(API_ENDPOINTS.auth.logout, {
        refreshToken: authStore.getRefreshToken(),
      });
    } catch {
      // Clear local session even if API logout fails
    }
  }
  authStore.clearTokens();
}

export async function updateProfile(payload: Partial<Pick<AuthUser, "name" | "email">> & { password?: string }): Promise<AuthUser> {
  if (env.VITE_MOCK_AUTH) {
    return { ...MOCK_SESSION.user, ...payload };
  }

  return apiPut<AuthUser, Partial<Pick<AuthUser, "name" | "email">> & { password?: string }>(API_ENDPOINTS.auth.updateProfile, payload);
}
