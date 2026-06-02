import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/api";
import { QUERY_STALE } from "@/constants";
import { customerService } from "@/services";

export function useCustomers() {
  return useQuery({
    queryKey: queryKeys.customers.lists(),
    queryFn: () => customerService.getCustomers(),
    staleTime: QUERY_STALE.customers,
  });
}
