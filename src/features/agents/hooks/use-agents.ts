import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/api";
import { QUERY_STALE } from "@/constants";
import { agentService } from "@/services";

export function useAgents(filters?: { search?: string }) {
  return useQuery({
    queryKey: [...queryKeys.agents.list(), filters],
    queryFn: () => agentService.getAgents(filters),
    staleTime: QUERY_STALE.agents,
  });
}
