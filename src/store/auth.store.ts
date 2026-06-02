import { AUTH_STORAGE_KEYS } from "@/constants";
import { isBrowser } from "@/lib/ssr";
import type { AuthTokens } from "@/types";

export const authStore = {
  getAccessToken(): string | null {
    if (!isBrowser()) return null;
    return localStorage.getItem(AUTH_STORAGE_KEYS.accessToken);
  },

  getRefreshToken(): string | null {
    if (!isBrowser()) return null;
    return localStorage.getItem(AUTH_STORAGE_KEYS.refreshToken);
  },

  getTokens(): AuthTokens | null {
    const accessToken = this.getAccessToken();
    const refreshToken = this.getRefreshToken();
    if (!accessToken || !refreshToken) return null;
    return { accessToken, refreshToken };
  },

  setTokens(tokens: AuthTokens): void {
    if (!isBrowser()) return;
    localStorage.setItem(AUTH_STORAGE_KEYS.accessToken, tokens.accessToken);
    localStorage.setItem(AUTH_STORAGE_KEYS.refreshToken, tokens.refreshToken);
  },

  clearTokens(): void {
    if (!isBrowser()) return;
    localStorage.removeItem(AUTH_STORAGE_KEYS.accessToken);
    localStorage.removeItem(AUTH_STORAGE_KEYS.refreshToken);
  },
};
