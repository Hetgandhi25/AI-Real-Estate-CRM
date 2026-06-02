import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/api";
import { QUERY_STALE } from "@/constants";
import { reviewService } from "@/services";

export function useReviews(filters?: { search?: string }) {
  return useQuery({
    queryKey: [...queryKeys.reviews.list(), filters],
    queryFn: () => reviewService.getReviews(filters),
    staleTime: QUERY_STALE.reviews,
  });
}
