/** Standard API envelope — align backend responses to this shape. */
export type ApiResponse<T> = {
  data: T;
  message?: string;
  success: boolean;
};

export type PaginatedResponse<T> = {
  data: T[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

export type ApiErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "NETWORK_ERROR"
  | "UNKNOWN";

export type ApiErrorBody = {
  message: string;
  code?: ApiErrorCode;
  status?: number;
  errors?: Record<string, string[]>;
};

export class ApiError extends Error {
  readonly status: number;
  readonly code: ApiErrorCode;
  readonly errors?: Record<string, string[]>;

  constructor(body: ApiErrorBody) {
    super(body.message);
    this.name = "ApiError";
    this.status = body.status ?? 500;
    this.code = body.code ?? "UNKNOWN";
    this.errors = body.errors;
  }

  static isApiError(error: unknown): error is ApiError {
    return error instanceof ApiError;
  }
}
