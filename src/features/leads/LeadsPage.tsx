import React, { useState, useEffect, useMemo } from "react";
import { Plus, Search, User, Edit3, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LabeledField } from "@/components/common/labeled-field";
import type { Lead, LeadSource, LeadStatus } from "@/types";
import { leadService } from "@/services";
import { queryKeys } from "@/api/query-keys";
import { useLeads, useCustomers, useAgents, useProperties, useQueryClient, useToast, useDebounce } from "@/hooks";

const STATUS_OPTIONS = [
  { value: "NEW", label: "New", bg: "bg-blue-50", color: "text-blue-700 border-blue-200" },
  { value: "CONTACTED", label: "Contacted", bg: "bg-yellow-50", color: "text-yellow-700 border-yellow-200" },
  { value: "QUALIFIED", label: "Qualified", bg: "bg-green-50", color: "text-green-700 border-green-200" },
  { value: "NEGOTIATING", label: "Negotiating", bg: "bg-purple-50", color: "text-purple-700 border-purple-200" },
  { value: "WON", label: "Won", bg: "bg-emerald-50", color: "text-emerald-700 border-emerald-200" },
  { value: "LOST", label: "Lost", bg: "bg-red-50", color: "text-red-700 border-red-200" },
];

const SOURCE_OPTIONS = [
  { value: "WEBSITE", label: "Website" },
  { value: "REFERRAL", label: "Referral" },
  { value: "PHONE", label: "Phone" },
  { value: "EMAIL", label: "Email" },
  { value: "SOCIAL_MEDIA", label: "Social Media" },
  { value: "OTHER", label: "Other" },
];

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_OPTIONS.find((o) => o.value === status) ?? STATUS_OPTIONS[0];
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${s.bg} ${s.color}`}>
      {s.label}
    </span>
  );
}

function LeadsPage() {
  const queryClient = useQueryClient();
  const toast = useToast();

  const [open, setOpen] = useState(false);
  const [editLead, setEditLead] = useState<Lead | null>(null);
  const [customerId, setCustomerId] = useState("");
  const [propertyId, setPropertyId] = useState("");
  const [source, setSource] = useState<LeadSource>("WEBSITE");
  const [status, setStatus] = useState<LeadStatus>("NEW");
  const [assignedAgentId, setAssignedAgentId] = useState("");
  const [notes, setNotes] = useState("");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Load search from URL query parameter if any on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const searchParam = params.get("search");
    if (searchParam) {
      setSearch(searchParam);
    }
  }, []);

  const { data: leadsRaw = [], isLoading } = useLeads(debouncedSearch || undefined);
  const { data: customers = [] } = useCustomers();
  const { data: agents = [] } = useAgents();
  const { data: properties = [] } = useProperties();

  // leads may be paginated from hook — handle both shapes
  const allLeads: Lead[] = useMemo(() => {
    const raw = leadsRaw as any;
    if (Array.isArray(raw)) return raw;
    if (raw?.data && Array.isArray(raw.data)) return raw.data;
    return [];
  }, [leadsRaw]);

  const filteredLeads = useMemo(
    () =>
      statusFilter === "all"
        ? allLeads
        : allLeads.filter((l) => l.status === statusFilter),
    [allLeads, statusFilter]
  );

  const resetForm = () => {
    setEditLead(null);
    setCustomerId("");
    setPropertyId("");
    setSource("WEBSITE");
    setStatus("NEW");
    setAssignedAgentId("");
    setNotes("");
  };

  const openNewLeadModal = () => {
    resetForm();
    setOpen(true);
  };

  const openEditLeadModal = (lead: Lead) => {
    setEditLead(lead);
    setCustomerId(lead.customerId);
    setPropertyId(lead.propertyId);
    setSource(lead.source);
    setStatus(lead.status);
    setAssignedAgentId(lead.assignedAgentId ?? "");
    setNotes(lead.notes ?? "");
    setOpen(true);
  };

  const closeModal = () => {
    setOpen(false);
    resetForm();
  };

  const handleSaveLead = async () => {
    if (!editLead && (!customerId || !propertyId)) {
      toast.error("Customer and property are required.");
      return;
    }

    setIsSaving(true);
    try {
      if (editLead) {
        await leadService.updateLead(editLead.id, {
          status,
          notes: notes.trim() || undefined,
          assignedAgentId: assignedAgentId || undefined,
        } as any);
        toast.success("Lead updated successfully");
      } else {
        await leadService.createLead({
          customerId,
          propertyId,
          source,
          notes: notes.trim() || undefined,
          assignedAgentId: assignedAgentId || undefined,
        } as any);
        toast.success("Lead created successfully");
      }
      await queryClient.invalidateQueries({ queryKey: queryKeys.leads.lists() });
      closeModal();
    } catch (error) {
      toast.fromApiError(error, editLead ? "Failed to update lead" : "Failed to create lead");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteLead = async (leadId: string) => {
    if (!window.confirm("Delete this lead? This action cannot be undone.")) return;
    setDeletingId(leadId);
    try {
      await leadService.deleteLead(leadId);
      toast.success("Lead deleted successfully");
      await queryClient.invalidateQueries({ queryKey: queryKeys.leads.lists() });
    } catch (error) {
      toast.fromApiError(error, "Failed to delete lead");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Leads</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isLoading ? "Loading leads..." : `${filteredLeads.length} lead record${filteredLeads.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <button
          type="button"
          onClick={openNewLeadModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[image:var(--gradient-primary)] text-primary-foreground text-sm font-medium shadow-[var(--shadow-glow)]"
        >
          <Plus className="size-4" aria-hidden />
          Add Lead
        </button>
      </div>

      {/* Filters */}
      <div className="glass-card rounded-2xl p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="relative md:col-span-2">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" aria-hidden />
          <input
            id="lead-search"
            name="search"
            type="search"
            autoComplete="off"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search leads by notes, status…"
            className="w-full h-11 pl-10 pr-3 rounded-xl bg-input border border-border text-sm"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-11 w-full rounded-xl bg-input border border-border text-sm px-3"
          aria-label="Filter by status"
        >
          <option value="all">All Statuses</option>
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="grid grid-cols-[2fr_2fr_1fr_1fr_1fr_auto] gap-3 px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-border bg-muted">
          <span>Customer</span>
          <span>Property</span>
          <span>Status</span>
          <span>Source</span>
          <span>Agent</span>
          <span className="text-right">Actions</span>
        </div>

        {isLoading ? (
          <div className="divide-y divide-border">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="grid grid-cols-[2fr_2fr_1fr_1fr_1fr_auto] gap-3 px-4 py-4 animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-4 bg-muted rounded w-2/3" />
                <div className="h-4 bg-muted rounded w-1/2" />
                <div className="h-4 bg-muted rounded w-1/2" />
                <div className="h-4 bg-muted rounded w-2/3" />
                <div className="h-4 bg-muted rounded w-16" />
              </div>
            ))}
          </div>
        ) : filteredLeads.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <div className="size-14 rounded-2xl bg-primary/10 grid place-items-center mb-4">
              <User className="size-7 text-primary" />
            </div>
            <p className="font-medium text-sm">No leads found</p>
            <p className="text-xs text-muted-foreground mt-1">Create your first lead to start tracking opportunities.</p>
            <button onClick={openNewLeadModal} className="mt-4 inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors">
              <Plus className="size-3.5" /> Add Lead
            </button>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredLeads.map((lead) => {
              const customerName = lead.customer?.name ?? customers.find((c) => c.id === lead.customerId)?.name ?? lead.customerId.slice(0, 8) + "…";
              const propertyTitle = lead.property?.title ?? properties.find((p) => p.id === lead.propertyId)?.title ?? lead.propertyId.slice(0, 8) + "…";
              const agentName = lead.assignedAgent?.name ?? agents.find((a) => a.userId === lead.assignedAgentId)?.name;

              return (
                <div key={lead.id} className="grid grid-cols-[2fr_2fr_1fr_1fr_1fr_auto] gap-3 px-4 py-3.5 text-sm items-center hover:bg-muted/30 transition-colors">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{customerName}</div>
                    {lead.customer?.email && <div className="text-muted-foreground text-xs truncate">{lead.customer.email}</div>}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate">{propertyTitle}</div>
                    {lead.property?.city && <div className="text-muted-foreground text-xs">{lead.property.city}</div>}
                  </div>
                  <div>
                    <StatusBadge status={lead.status} />
                  </div>
                  <div className="text-muted-foreground text-xs">{lead.source.replace(/_/g, " ")}</div>
                  <div className="text-sm truncate">{agentName ?? <span className="text-muted-foreground">Unassigned</span>}</div>
                  <div className="flex justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => openEditLeadModal(lead)}
                      className="inline-flex items-center justify-center rounded-lg border border-border p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      aria-label="Edit lead"
                    >
                      <Edit3 className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteLead(lead.id)}
                      disabled={deletingId === lead.id}
                      className="inline-flex items-center justify-center rounded-lg border border-border p-1.5 text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-40"
                      aria-label="Delete lead"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editLead ? "Edit Lead" : "Add Lead"}</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-4 mt-4">
            {!editLead && (
              <>
                <LabeledField id="lead-customer" label="Customer">
                  <select
                    id="lead-customer"
                    value={customerId}
                    onChange={(e) => setCustomerId(e.target.value)}
                    className="w-full rounded-xl border border-border bg-input px-3 py-2 text-sm"
                  >
                    <option value="">Select customer…</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>{c.name} — {c.email}</option>
                    ))}
                  </select>
                </LabeledField>

                <LabeledField id="lead-property" label="Property">
                  <select
                    id="lead-property"
                    value={propertyId}
                    onChange={(e) => setPropertyId(e.target.value)}
                    className="w-full rounded-xl border border-border bg-input px-3 py-2 text-sm"
                  >
                    <option value="">Select property…</option>
                    {properties.map((p) => (
                      <option key={p.id} value={p.id}>{p.title} — {p.city}, {p.state}</option>
                    ))}
                  </select>
                </LabeledField>

                <LabeledField id="lead-source" label="Source">
                  <select
                    id="lead-source"
                    value={source}
                    onChange={(e) => setSource(e.target.value as LeadSource)}
                    className="w-full rounded-xl border border-border bg-input px-3 py-2 text-sm"
                  >
                    {SOURCE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </LabeledField>
              </>
            )}

            {editLead && (
              <LabeledField id="lead-status" label="Status">
                <select
                  id="lead-status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as LeadStatus)}
                  className="w-full rounded-xl border border-border bg-input px-3 py-2 text-sm"
                >
                  {STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </LabeledField>
            )}

            <LabeledField id="lead-agent" label="Assign Agent">
              <select
                id="lead-agent"
                value={assignedAgentId}
                onChange={(e) => setAssignedAgentId(e.target.value)}
                className="w-full rounded-xl border border-border bg-input px-3 py-2 text-sm"
              >
                <option value="">Unassigned</option>
                {agents.map((a) => (
                  <option key={a.id} value={a.userId}>{a.name} — {a.specialization ?? "General"}</option>
                ))}
              </select>
            </LabeledField>

            <LabeledField id="lead-notes" label="Notes">
              <textarea
                id="lead-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Internal notes about this lead…"
                className="w-full rounded-xl border border-border bg-input px-3 py-2 text-sm resize-none"
              />
            </LabeledField>
          </div>

          <div className="mt-6 flex items-center justify-end gap-3">
            <button type="button" onClick={closeModal} className="rounded-xl border border-border px-4 py-2 text-sm text-muted-foreground hover:bg-muted transition-colors">
              Cancel
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={handleSaveLead}
              className="rounded-xl bg-[image:var(--gradient-primary)] px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
            >
              {isSaving ? (editLead ? "Saving…" : "Creating…") : editLead ? "Save Changes" : "Create Lead"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default LeadsPage;