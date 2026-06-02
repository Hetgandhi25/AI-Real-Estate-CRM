import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/api";
import { QUERY_STALE } from "@/constants";
import { agentService } from "@/services";

export function useAgents() {
  return useQuery({
    queryKey: queryKeys.agents.list(),
    queryFn: () => agentService.getAgents(),
    staleTime: QUERY_STALE.agents,
  });
}
