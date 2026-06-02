import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/api";
import { QUERY_STALE } from "@/constants";
import { customerService } from "@/services";

export function useCustomers(filters?: { search?: string; whatsappOnly?: string | boolean; location?: string }) {
  return useQuery({
    queryKey: [...queryKeys.customers.lists(), filters],
    queryFn: () => customerService.getCustomers(filters),
    staleTime: QUERY_STALE.customers,
  });
}
