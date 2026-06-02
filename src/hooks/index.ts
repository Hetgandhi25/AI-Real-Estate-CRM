// Core auth/session/utility hooks (stay in src/hooks)
export { useAuth } from "./use-auth";
export { useSession } from "./use-session";
export { useRole } from "./use-role";
export { useRequireAuth } from "./use-require-auth";
export { useToast } from "./use-toast";
export { useIsMobile } from "./use-mobile";
export { useHydrated } from "./use-hydrated";
export { useDebounce } from "./use-debounce";

// React Query — re-exported for convenience so feature pages don't need a separate import
export { useQueryClient } from "@tanstack/react-query";

// Feature query hooks — now co-located inside features, re-exported here for backwards compat
export { useDashboardSummary } from "@/features/dashboard/hooks/use-dashboard";
export { useAnalyticsSummary } from "@/features/analytics/hooks/use-analytics";
export { useProperties, useProperty, useCreateProperty, useUpdateProperty, useDeleteProperty } from "@/features/properties/hooks/use-properties";
export { useCustomers } from "@/features/customers/hooks/use-customers";
export { useLeads } from "@/features/leads/hooks/use-leads";
export { useAgents } from "@/features/agents/hooks/use-agents";
export { useConversations } from "@/features/messages/hooks/use-conversations";
export { useReviews } from "@/features/reviews/hooks/use-reviews";
export { useAppointments } from "@/features/calendar/hooks/use-appointments";
