import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/api";
import { QUERY_STALE } from "@/constants";
import { reviewService } from "@/services";

export function useReviews() {
  return useQuery({
    queryKey: queryKeys.reviews.list(),
    queryFn: () => reviewService.getReviews(),
    staleTime: QUERY_STALE.reviews,
  });
}
