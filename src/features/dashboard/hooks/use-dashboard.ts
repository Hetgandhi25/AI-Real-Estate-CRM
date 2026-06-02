import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/api";
import { QUERY_STALE } from "@/constants";
import { dashboardService } from "@/services";

export function useDashboardSummary() {
  return useQuery({
    queryKey: queryKeys.dashboard.summary(),
    queryFn: () => dashboardService.getDashboardSummary(),
    staleTime: QUERY_STALE.dashboard,
  });
}
