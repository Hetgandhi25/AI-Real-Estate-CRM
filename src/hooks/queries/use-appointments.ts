import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/api";
import { QUERY_STALE } from "@/constants";
import { appointmentService } from "@/services";

export function useAppointments() {
  return useQuery({
    queryKey: queryKeys.appointments.list(),
    queryFn: () => appointmentService.getAppointments(),
    staleTime: QUERY_STALE.appointments,
  });
}
