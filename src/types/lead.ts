export type LeadStatus = "NEW" | "CONTACTED" | "QUALIFIED" | "LOST" | "WON";
export type LeadSource = "WEBSITE" | "REFERRAL" | "SOCIAL_MEDIA" | "ADVERTISEMENT" | "WALK_IN" | "OTHER";

export type Lead = {
  id: string;
  customerId: string;
  propertyId: string;
  status: LeadStatus;
  source: LeadSource;
  notes?: string;
  assignedAgentId?: string | null;
  // Populated by include
  customer?: { id: string; name: string; email: string } | null;
  property?: { id: string; title: string; city: string; status: string } | null;
  assignedAgent?: { id: string; name: string; email: string } | null;
  createdAt?: string;
  updatedAt?: string;
};
