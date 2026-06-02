import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/api";
import { QUERY_STALE } from "@/constants";
import { dashboardService } from "@/services";

export function useAnalyticsSummary() {
  return useQuery({
    queryKey: queryKeys.dashboard.analytics(),
    queryFn: () => dashboardService.getAnalyticsSummary(),
    staleTime: QUERY_STALE.dashboard,
  });
}
