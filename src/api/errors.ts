import type { AxiosError } from "axios";
import { ApiError, type ApiErrorBody, type ApiErrorCode } from "@/types";

function statusToCode(status: number): ApiErrorCode {
  if (status === 401) return "UNAUTHORIZED";
  if (status === 403) return "FORBIDDEN";
  if (status === 404) return "NOT_FOUND";
  if (status === 422) return "VALIDATION_ERROR";
  return "UNKNOWN";
}

export function normalizeApiError(error: unknown): ApiError {
  if (ApiError.isApiError(error)) return error;

  if (isAxiosError(error)) {
    const status = error.response?.status ?? 0;
    const data = error.response?.data as Partial<ApiErrorBody> | undefined;

    if (!error.response) {
      return new ApiError({
        message: "Network error. Check your connection and try again.",
        code: "NETWORK_ERROR",
        status: 0,
      });
    }

    return new ApiError({
      message: data?.message ?? error.message ?? "Request failed",
      code: data?.code ?? statusToCode(status),
      status,
      errors: data?.errors,
    });
  }

  if (error instanceof Error) {
    return new ApiError({ message: error.message, code: "UNKNOWN", status: 500 });
  }

  return new ApiError({ message: "An unexpected error occurred", code: "UNKNOWN", status: 500 });
}

function isAxiosError(error: unknown): error is AxiosError {
  return typeof error === "object" && error !== null && "isAxiosError" in error;
}
