import axios, { type AxiosInstance, type AxiosRequestConfig } from "axios";
import { env } from "@/config";
import { attachRequestInterceptor, attachResponseInterceptor } from "@/api/interceptors";
import type { ApiResponse } from "@/types";

function createAxiosInstance(): AxiosInstance {
  const instance = axios.create({
    baseURL: env.VITE_API_BASE_URL,
    timeout: env.VITE_API_TIMEOUT,
    withCredentials: true,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  });

  attachRequestInterceptor(instance);
  attachResponseInterceptor(instance);

  return instance;
}

export const apiClient = createAxiosInstance();

/** Typed GET — unwraps `ApiResponse<T>` when backend uses standard envelope. */
export async function apiGet<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const { data } = await apiClient.get<ApiResponse<T>>(url, config);
  return unwrapResponse(data);
}

export async function apiPost<T, B = unknown>(
  url: string,
  body?: B,
  config?: AxiosRequestConfig,
): Promise<T> {
  const { data } = await apiClient.post<ApiResponse<T>>(url, body, config);
  return unwrapResponse(data);
}

export async function apiPut<T, B = unknown>(
  url: string,
  body?: B,
  config?: AxiosRequestConfig,
): Promise<T> {
  const { data } = await apiClient.put<ApiResponse<T>>(url, body, config);
  return unwrapResponse(data);
}

export async function apiPatch<T, B = unknown>(
  url: string,
  body?: B,
  config?: AxiosRequestConfig,
): Promise<T> {
  const { data } = await apiClient.patch<ApiResponse<T>>(url, body, config);
  return unwrapResponse(data);
}

export async function apiDelete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const { data } = await apiClient.delete<ApiResponse<T>>(url, config);
  return unwrapResponse(data);
}

function unwrapResponse<T>(payload: ApiResponse<T> | T): T {
  if (payload && typeof payload === "object" && "data" in payload) {
    return (payload as ApiResponse<T>).data;
  }
  return payload as T;
}
