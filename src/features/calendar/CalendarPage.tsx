import React, { useState, useEffect, useMemo } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { Plus, Trash2, CalendarCheck2, Clock, CheckCircle, XCircle, RotateCcw, Search } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { Appointment } from '@/types';
import { appointmentService } from '@/services';
import { queryKeys } from '@/api/query-keys';
import { useAppointments, useCustomers, useAgents, useProperties, useQueryClient, useToast, useDebounce } from '@/hooks';
import { authGuard } from '@/lib/auth-guard';
import { ROUTES } from '@/constants/routes';

const STATUS_OPTIONS = ['SCHEDULED', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'RESCHEDULED'];

const STATUS_META: Record<string, { label: string; bg: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  SCHEDULED: { label: 'Scheduled', bg: 'bg-blue-500/15', color: 'text-blue-400 border-blue-500/30', icon: Clock },
  CONFIRMED: { label: 'Confirmed', bg: 'bg-emerald-500/15', color: 'text-emerald-400 border-emerald-500/30', icon: CheckCircle },
  COMPLETED: { label: 'Completed', bg: 'bg-emerald-500/15', color: 'text-emerald-400 border-emerald-500/30', icon: CalendarCheck2 },
  CANCELLED: { label: 'Cancelled', bg: 'bg-red-500/15', color: 'text-red-400 border-red-500/30', icon: XCircle },
  RESCHEDULED: { label: 'Rescheduled', bg: 'bg-amber-500/15', color: 'text-amber-400 border-amber-500/30', icon: RotateCcw },
};

function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status] ?? STATUS_META.SCHEDULED;
  const Icon = meta.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${meta.bg} ${meta.color}`}>
      <Icon className="size-3" />
      {meta.label}
    </span>
  );
}

function groupAppointmentsByDate(appointments: Appointment[]) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const nextWeek = new Date(today);
  nextWeek.setDate(today.getDate() + 7);

  const groups: { label: string; items: Appointment[] }[] = [
    { label: "Today", items: [] },
    { label: "Tomorrow", items: [] },
    { label: "This Week", items: [] },
    { label: "Later", items: [] },
    { label: "Past", items: [] },
  ];

  for (const appt of appointments) {
    const d = new Date(appt.scheduledAt);
    const apptDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    if (apptDay < today) {
      groups[4].items.push(appt);
    } else if (apptDay.getTime() === today.getTime()) {
      groups[0].items.push(appt);
    } else if (apptDay.getTime() === tomorrow.getTime()) {
      groups[1].items.push(appt);
    } else if (apptDay < nextWeek) {
      groups[2].items.push(appt);
    } else {
      groups[3].items.push(appt);
    }
  }

  return groups.filter((g) => g.items.length > 0);
}

export const Route = createFileRoute("/calendar")({
  beforeLoad: () => authGuard({ route: ROUTES.calendar }),
  head: () => ({ meta: [{ title: "Calendar — Ishan Technologies" }] }),
  component: CalendarPage,
});

function CalendarPage() {
  const queryClient = useQueryClient();
  const toast = useToast();
  
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const debouncedSearch = useDebounce(search, 300);

  const { data: appointments = [], isLoading } = useAppointments({
    search: debouncedSearch || undefined,
    status: statusFilter === "all" ? undefined : statusFilter,
  });
  const { data: customers = [] } = useCustomers();
  const { data: agents = [] } = useAgents();
  const { data: properties = [] } = useProperties();

  const [open, setOpen] = useState(false);
  const [customerId, setCustomerId] = useState("");
  const [propertyId, setPropertyId] = useState("");
  const [agentId, setAgentId] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [status, setStatus] = useState<Appointment["status"]>("SCHEDULED");
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);

  // Load search from URL query parameter if any on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const searchParam = params.get("search");
    if (searchParam) {
      setSearch(searchParam);
    }
  }, []);

  const sorted = useMemo(
    () => [...appointments].sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()),
    [appointments]
  );
  const groups = useMemo(() => groupAppointmentsByDate(sorted), [sorted]);

  const openNewAppointment = () => {
    setCustomerId(customers[0]?.id ?? "");
    setPropertyId(properties[0]?.id ?? "");
    setAgentId(agents[0]?.userId ?? "");
    setScheduledAt("");
    setStatus("SCHEDULED");
    setNotes("");
    setOpen(true);
  };

  const handleCreateAppointment = async () => {
    if (!customerId || !scheduledAt) {
      toast.error("Customer and scheduled date are required.");
      return;
    }
    setIsSaving(true);
    try {
      await appointmentService.createAppointment({
        customerId,
        propertyId: propertyId || undefined,
        assignedAgentId: agentId || undefined,
        scheduledAt,
        status,
        notes: notes.trim() || undefined,
      });
      await queryClient.invalidateQueries({ queryKey: queryKeys.appointments.list() });
      toast.success("Appointment scheduled successfully.");
      setOpen(false);
    } catch (error) {
      toast.fromApiError(error, "Failed to schedule appointment");
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangeStatus = async (id: string, newStatus: string) => {
    setUpdatingStatusId(id);
    try {
      await appointmentService.updateAppointment(id, { status: newStatus as Appointment["status"] });
      await queryClient.invalidateQueries({ queryKey: queryKeys.appointments.list() });
      toast.success(`Appointment marked as ${newStatus.toLowerCase()}.`);
    } catch (error) {
      toast.fromApiError(error, "Failed to update appointment");
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const handleDeleteAppointment = async (id: string) => {
    if (!window.confirm("Remove this appointment? This cannot be undone.")) return;
    setDeletingId(id);
    try {
      await appointmentService.deleteAppointment(id);
      await queryClient.invalidateQueries({ queryKey: queryKeys.appointments.list() });
      toast.success("Appointment deleted.");
    } catch (error) {
      toast.fromApiError(error, "Failed to remove appointment");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Calendar</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isLoading ? "Loading appointments…" : `${appointments.length} appointment${appointments.length !== 1 ? "s" : ""} scheduled`}
          </p>
        </div>
        <button
          type="button"
          onClick={openNewAppointment}
          className="inline-flex items-center gap-2 rounded-xl bg-[image:var(--gradient-primary)] px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-[var(--shadow-glow)]"
        >
          <Plus className="size-4" aria-hidden />
          Schedule Appointment
        </button>
      </div>

      {/* Filters */}
      <div className="glass-card rounded-2xl p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="relative md:col-span-2">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" aria-hidden />
          <input
            id="appt-search"
            name="search"
            type="text"
            autoComplete="off"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search appointments by notes, customer, status…"
            className="w-full h-11 pl-10 pr-3 rounded-xl bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-11 w-full rounded-xl bg-input border border-border text-sm px-3 focus:outline-none focus:ring-2 focus:ring-ring/40"
          aria-label="Filter by status"
        >
          <option value="all">All Statuses</option>
          {STATUS_OPTIONS.map((o) => (
            <option key={o} value={o}>{o.charAt(0) + o.slice(1).toLowerCase()}</option>
          ))}
        </select>
      </div>

      {/* Appointments grouped by date */}
      {isLoading ? (
        <div className="glass-card rounded-2xl divide-y divide-border">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="p-4 animate-pulse flex gap-4">
              <div className="size-12 rounded-xl bg-muted flex-shrink-0" />
              <div className="flex-1 space-y-2 py-1">
                <div className="h-3.5 bg-muted rounded w-1/3" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : groups.length === 0 ? (
        <div className="glass-card rounded-2xl flex flex-col items-center py-16 text-center">
          <div className="size-14 rounded-2xl bg-primary/10 grid place-items-center mb-4">
            <CalendarCheck2 className="size-7 text-primary" />
          </div>
          <p className="font-medium">No appointments scheduled</p>
          <p className="text-xs text-muted-foreground mt-1">Click "Schedule Appointment" to get started.</p>
          <button onClick={openNewAppointment} className="mt-4 inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors">
            <Plus className="size-3.5" /> Add Appointment
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map(({ label, items }) => (
            <div key={label} className="glass-card rounded-2xl overflow-hidden">
              <div className="px-5 py-3 bg-muted border-b border-border text-sm font-semibold text-muted-foreground flex items-center gap-2">
                <span className={`size-2 rounded-full ${label === "Today" ? "bg-emerald-400 animate-pulse" : label === "Past" ? "bg-muted-foreground" : "bg-primary"}`} />
                {label}
                <span className="text-xs font-normal text-muted-foreground/70">({items.length})</span>
              </div>
              <div className="divide-y divide-border">
                {items.map((appt) => {
                  const customer = customers.find((c) => c.id === appt.customerId);
                  const agent = agents.find((a) => a.userId === appt.assignedAgentId);
                  const property = properties.find((p) => p.id === appt.propertyId);
                  const d = new Date(appt.scheduledAt);
                  return (
                    <div key={appt.id} className="grid grid-cols-[auto_1fr_auto] gap-4 px-5 py-4 items-center hover:bg-muted/30 transition-colors">
                      {/* Date badge */}
                      <div className="text-center flex-shrink-0 w-14">
                        <p className="text-xs text-muted-foreground uppercase tracking-wider">{d.toLocaleDateString("en-US", { weekday: "short" })}</p>
                        <p className="text-2xl font-bold tabular-nums leading-none">{d.getDate()}</p>
                        <p className="text-xs text-muted-foreground">{d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
                      </div>
                      {/* Details */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">{customer?.name ?? "Unknown Customer"}</span>
                          <StatusBadge status={appt.status} />
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5 space-x-2">
                          {agent && <span>Agent: {agent.name}</span>}
                          {property && <span>· {property.title}</span>}
                          {appt.notes && <span>· {appt.notes}</span>}
                        </div>
                      </div>
                      {/* Actions */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {/* Quick status cycle */}
                        {appt.status !== "COMPLETED" && appt.status !== "CANCELLED" && (
                          <select
                            value={appt.status}
                            disabled={updatingStatusId === appt.id}
                            onChange={(e) => handleChangeStatus(appt.id, e.target.value)}
                            className="h-8 text-xs rounded-lg border border-border bg-input px-2 text-muted-foreground hover:text-foreground"
                            aria-label="Change status"
                          >
                            {STATUS_OPTIONS.map((s) => (
                              <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>
                            ))}
                          </select>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDeleteAppointment(appt.id)}
                          disabled={deletingId === appt.id}
                          className="h-8 w-8 rounded-lg border border-border flex items-center justify-center text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-40"
                          aria-label="Delete appointment"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Schedule Appointment Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Schedule Appointment</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-4 mt-4">
            <label className="space-y-2 block">
              <span className="text-sm font-medium">Customer</span>
              <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} className="w-full rounded-xl border border-border bg-input px-3 py-2 text-sm">
                <option value="">Select customer…</option>
                {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
            <label className="space-y-2 block">
              <span className="text-sm font-medium">Property (optional)</span>
              <select value={propertyId} onChange={(e) => setPropertyId(e.target.value)} className="w-full rounded-xl border border-border bg-input px-3 py-2 text-sm">
                <option value="">No specific property</option>
                {properties.map((p) => <option key={p.id} value={p.id}>{p.title} — {p.city}</option>)}
              </select>
            </label>
            <label className="space-y-2 block">
              <span className="text-sm font-medium">Assign Agent</span>
              <select value={agentId} onChange={(e) => setAgentId(e.target.value)} className="w-full rounded-xl border border-border bg-input px-3 py-2 text-sm">
                <option value="">Unassigned</option>
                {agents.map((a) => <option key={a.id} value={a.userId}>{a.name}</option>)}
              </select>
            </label>
            <label className="space-y-2 block">
              <span className="text-sm font-medium">Date & Time</span>
              <input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} className="w-full rounded-xl border border-border bg-input px-3 py-2 text-sm" />
            </label>
            <label className="space-y-2 block">
              <span className="text-sm font-medium">Notes</span>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Any special requirements…" className="w-full rounded-xl border border-border bg-input px-3 py-2 text-sm resize-none" />
            </label>
          </div>
          <div className="mt-4 flex items-center justify-end gap-3">
            <button type="button" onClick={() => setOpen(false)} className="rounded-xl border border-border px-4 py-2 text-sm text-muted-foreground">Cancel</button>
            <button type="button" onClick={handleCreateAppointment} disabled={isSaving} className="rounded-xl bg-[image:var(--gradient-primary)] px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60">
              {isSaving ? "Scheduling…" : "Schedule Appointment"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default CalendarPage;