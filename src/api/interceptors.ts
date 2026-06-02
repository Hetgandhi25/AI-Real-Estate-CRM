import type { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from "axios";
import axios from "axios";
import { API_ENDPOINTS } from "@/api/endpoints";
import { normalizeApiError } from "@/api/errors";
import { authStore } from "@/store";
import type { ApiResponse } from "@/types";
import type { AuthTokens } from "@/types/auth";

type RetryableConfig = InternalAxiosRequestConfig & { _retry?: boolean };

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(client: AxiosInstance): Promise<string | null> {
  const refreshToken = authStore.getRefreshToken();

  try {
    // Use a plain axios instance WITHOUT the interceptors attached to avoid recursion
    const plain = axios.create({
      baseURL: client.defaults.baseURL,
      timeout: client.defaults.timeout as number | undefined,
      withCredentials: true,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });

    // If we have a client-side refresh token, send it in the body; otherwise rely on server-set HttpOnly cookie.
    const body = refreshToken ? { refreshToken } : undefined;
    const response = await plain.post(API_ENDPOINTS.auth.refresh, body);
    // Backend may return either an envelope { data: Session } or raw session/tokens.
    const payload = (response.data ?? null) as any;

    // Prefer envelope shape: { data: { accessToken, refreshToken } }
    const tokens = (payload && payload.data) || payload || null;

    if (!tokens || !tokens.accessToken) {
      authStore.clearTokens();
      return null;
    }

    // Only store access/refresh tokens (ignore additional user payloads)
    authStore.setTokens({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken });
    return tokens.accessToken as string;
  } catch (err) {
    authStore.clearTokens();
    return null;
  }
}

export function attachRequestInterceptor(client: AxiosInstance): void {
  client.interceptors.request.use((config) => {
    const token = authStore.getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });
}

export function attachResponseInterceptor(client: AxiosInstance): void {
  client.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const original = error.config as RetryableConfig | undefined;
      const status = error.response?.status;

      // Avoid trying to refresh when the failed request itself is the refresh endpoint
      const reqUrl = original?.url ?? "";
      if (reqUrl.includes(API_ENDPOINTS.auth.refresh)) {
        return Promise.reject(normalizeApiError(error));
      }

      if (status === 401 && original && !original._retry) {
        original._retry = true;

        refreshPromise ??= refreshAccessToken(client).finally(() => {
          refreshPromise = null;
        });

        const accessToken = await refreshPromise;
        if (accessToken) {
          original.headers.Authorization = `Bearer ${accessToken}`;
          return client(original);
        }
      }

      return Promise.reject(normalizeApiError(error));
    },
  );
}
