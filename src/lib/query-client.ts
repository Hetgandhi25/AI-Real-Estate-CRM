import { QueryClient, type DefaultOptions } from "@tanstack/react-query";
import { QUERY_DEFAULTS } from "@/constants";
import { ApiError } from "@/types";

const defaultOptions: DefaultOptions = {
  queries: {
    staleTime: QUERY_DEFAULTS.staleTime,
    gcTime: QUERY_DEFAULTS.gcTime,
    retry: (failureCount, error) => {
      if (ApiError.isApiError(error)) {
        if (error.status === 401 || error.status === 403 || error.status === 404) {
          return false;
        }
      }
      return failureCount < QUERY_DEFAULTS.retry;
    },
    refetchOnWindowFocus: QUERY_DEFAULTS.refetchOnWindowFocus,
    throwOnError: false,
  },
  mutations: {
    retry: 0,
    throwOnError: false,
  },
};

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions,
  });
}
