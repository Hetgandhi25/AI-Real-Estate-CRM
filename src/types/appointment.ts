export type AppointmentStatus = "SCHEDULED" | "CONFIRMED" | "CANCELLED" | "COMPLETED";

export type Appointment = {
  id: string;
  customerId: string;
  propertyId?: string | null;
  assignedAgentId?: string | null;
  scheduledAt: string;
  status: AppointmentStatus;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
};
