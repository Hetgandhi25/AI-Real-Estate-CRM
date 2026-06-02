import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/api";
import { QUERY_STALE } from "@/constants";
import { leadService } from "@/services";

export function useLeads(search?: string) {
  return useQuery({
    queryKey: queryKeys.leads.list({ search }),
    queryFn: () => leadService.getLeads(search),
    staleTime: QUERY_STALE.leads,
  });
}
