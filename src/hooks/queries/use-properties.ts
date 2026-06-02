import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/api";
import { QUERY_STALE } from "@/constants";
import { propertyService } from "@/services";
import type { PropertyFilters } from "@/types";

export function useProperties(filters?: PropertyFilters) {
  return useQuery({
    queryKey: queryKeys.properties.list(filters),
    queryFn: () => propertyService.getProperties(filters),
    staleTime: QUERY_STALE.properties,
  });
}

export function useProperty(id: string) {
  return useQuery({
    queryKey: queryKeys.properties.detail(id),
    queryFn: () => propertyService.getPropertyById(id),
    enabled: Boolean(id),
    staleTime: QUERY_STALE.propertyDetail,
  });
}
