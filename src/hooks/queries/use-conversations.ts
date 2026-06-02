import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/api";
import { QUERY_STALE } from "@/constants";
import { conversationService } from "@/services";

export function useConversations() {
  return useQuery({
    queryKey: queryKeys.conversations.list(),
    queryFn: () => conversationService.getConversations(),
    staleTime: QUERY_STALE.conversations,
  });
}
