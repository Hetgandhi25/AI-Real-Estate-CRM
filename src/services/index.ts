// Barrel re-exports — all services now live in their feature directories.
// External consumers (@/services) remain unaffected.
export * as authService from "@/features/auth/services/auth.service";
export * as dashboardService from "@/features/dashboard/services/dashboard.service";
export * as agentService from "@/features/agents/services/agent.service";
export * as conversationService from "@/features/messages/services/conversation.service";
export * as reviewService from "@/features/reviews/services/review.service";
export * as appointmentService from "@/features/calendar/services/appointment.service";
export * as propertyService from "@/features/properties/services/property.service";
export * as customerService from "@/features/customers/services/customer.service";
export * as leadService from "@/features/leads/services/lead.service";
export * as aiBotService from "@/features/ai-bot/services/ai-bot.service";

