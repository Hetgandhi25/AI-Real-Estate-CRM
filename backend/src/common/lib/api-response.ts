import type { ApiErrorBody } from "../types/api.js";

export type ApiSuccessResponse<T> = {
  data: T;
  message?: string;
  success: true;
};

export type ApiErrorResponse = ApiErrorBody & {
  success?: false;
};

export function createSuccessResponse<T>(data: T, message?: string): ApiSuccessResponse<T> {
  return {
    data,
    message,
    success: true,
  };
}

export function createErrorResponse(message: string, statusCode = 500, code?: string, errors?: Record<string, string[]>): ApiErrorResponse {
  return {
    message,
    status: statusCode,
    code: (code as any) ?? undefined,
    errors,
    success: false,
  };
}
