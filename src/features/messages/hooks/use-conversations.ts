import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/api";
import { QUERY_STALE } from "@/constants";
import { conversationService } from "@/services";

export function useConversations(filters?: { search?: string }) {
  return useQuery({
    queryKey: [...queryKeys.conversations.list(), filters],
    queryFn: () => conversationService.getConversations(filters),
    staleTime: QUERY_STALE.conversations,
  });
}
