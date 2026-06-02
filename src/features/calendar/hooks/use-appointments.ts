import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/api";
import { QUERY_STALE } from "@/constants";
import { appointmentService } from "@/services";

export function useAppointments(filters?: { search?: string; status?: string }) {
  return useQuery({
    queryKey: [...queryKeys.appointments.list(), filters],
    queryFn: () => appointmentService.getAppointments(filters),
    staleTime: QUERY_STALE.appointments,
  });
}
