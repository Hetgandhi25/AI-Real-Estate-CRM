import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Edit3, Trash2, Search } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { LabeledField } from '@/components/common/labeled-field';
import type { Agent } from '@/types';
import { agentService } from '@/services';
import { queryKeys } from '@/api/query-keys';
import { useAgents, useQueryClient, useToast, useDebounce } from '@/hooks';

function AgentsPage() {
  const queryClient = useQueryClient();
  const toast = useToast();
  
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);

  const { data: agents = [], isLoading } = useAgents({ search: debouncedSearch || undefined });

  const [open, setOpen] = useState(false);
  const [currentAgent, setCurrentAgent] = useState<Agent | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [experience, setExperience] = useState("0");
  const [specialization, setSpecialization] = useState("");
  const [performanceScore, setPerformanceScore] = useState("0");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Load search from URL query parameter if any on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const searchParam = params.get("search");
    if (searchParam) {
      setSearch(searchParam);
    }
  }, []);

  const sortedAgents = useMemo(() => [...agents].sort((a, b) => b.performanceScore - a.performanceScore), [agents]);

  const openNewAgentModal = () => {
    setCurrentAgent(null);
    setName("");
    setEmail("");
    setPassword("");
    setExperience("0");
    setSpecialization("");
    setPerformanceScore("0");
    setOpen(true);
  };

  const openEditAgentModal = (agent: Agent) => {
    setCurrentAgent(agent);
    setName(agent.name);
    setEmail(agent.email);
    setPassword("");
    setExperience(String(agent.experience ?? 0));
    setSpecialization(agent.specialization ?? "");
    setPerformanceScore(String(agent.performanceScore ?? 0));
    setOpen(true);
  };

  const closeModal = () => {
    setOpen(false);
    setCurrentAgent(null);
  };

  const handleSaveAgent = async () => {
    if (!name.trim() || !email.trim() || (!currentAgent && !password.trim())) {
      toast.error("Name, email and password are required for a new agent.");
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        name: name.trim(),
        email: email.trim(),
        password: password.trim() || undefined,
        experience: Number(experience) || 0,
        specialization: specialization.trim() || undefined,
        performanceScore: Number(performanceScore) || 0,
      };

      if (currentAgent) {
        await agentService.updateAgent(currentAgent.id, payload);
        toast.success("Agent updated successfully");
      } else {
        await agentService.createAgent({ ...payload, password: payload.password ?? "Password123" });
        toast.success("Agent created successfully");
      }

      await queryClient.invalidateQueries({ queryKey: queryKeys.agents.list() });
      closeModal();
    } catch (error) {
      toast.fromApiError(error, "Unable to save agent");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAgent = async (agentId: string) => {
    if (!window.confirm("Delete this agent? This cannot be undone.")) return;
    setIsDeleting(true);
    try {
      await agentService.deleteAgent(agentId);
      toast.success("Agent removed successfully");
      await queryClient.invalidateQueries({ queryKey: queryKeys.agents.list() });
    } catch (error) {
      toast.fromApiError(error, "Failed to delete agent");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Agents</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isLoading ? "Loading agents..." : `${agents.length} active agent profiles.`}
          </p>
        </div>
        <button type="button" onClick={openNewAgentModal} className="inline-flex items-center gap-2 rounded-xl bg-[image:var(--gradient-primary)] px-4 py-2 text-sm font-medium text-primary-foreground shadow-[var(--shadow-glow)]">
          <Plus className="size-4" aria-hidden /> Add Agent
        </button>
      </div>

      <div className="glass-card rounded-2xl p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="relative md:col-span-2">
          <label htmlFor="agent-search" className="sr-only">
            Search agents
          </label>
          <Search
            className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none"
            aria-hidden
          />
          <input
            id="agent-search"
            name="search"
            type="text"
            autoComplete="off"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name, email or specialization..."
            className="w-full h-11 pl-10 pr-3 rounded-xl bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
          />
        </div>
      </div>

      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="grid grid-cols-4 gap-4 px-4 py-3 text-sm font-semibold text-muted-foreground border-b border-border bg-muted">
          <span>Name</span>
          <span>Email</span>
          <span>Specialization</span>
          <span className="text-right">Actions</span>
        </div>
        <div className="divide-y divide-border">
          {sortedAgents.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">No agent profiles found.</div>
          ) : (
            sortedAgents.map((agent) => (
              <div key={agent.id} className="grid grid-cols-4 gap-4 px-4 py-4 text-sm items-center">
                <div>
                  <div className="font-medium">{agent.name}</div>
                  <div className="text-muted-foreground text-xs">Score {agent.performanceScore}</div>
                </div>
                <div>{agent.email}</div>
                <div>{agent.specialization ?? "General"}</div>
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => openEditAgentModal(agent)} className="inline-flex items-center justify-center rounded-lg border border-border p-2 text-muted-foreground hover:text-foreground">
                    <Edit3 className="size-4" />
                  </button>
                  <button type="button" onClick={() => handleDeleteAgent(agent.id)} className="inline-flex items-center justify-center rounded-lg border border-border p-2 text-destructive hover:bg-destructive/10" disabled={isDeleting}>
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{currentAgent ? "Edit Agent" : "Create Agent"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-4 mt-4">
            <label className="space-y-2">
              <span className="text-sm font-medium">Name</span>
              <input value={name} onChange={(event) => setName(event.target.value)} className="w-full rounded-xl border border-border bg-input px-3 py-2 text-sm" />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium">Email</span>
              <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="w-full rounded-xl border border-border bg-input px-3 py-2 text-sm" />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium">Password{currentAgent ? " (leave blank to keep current)" : ""}</span>
              <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-xl border border-border bg-input px-3 py-2 text-sm" />
            </label>
            <div className="grid grid-cols-2 gap-4">
              <label className="space-y-2">
                <span className="text-sm font-medium">Experience</span>
                <input type="number" min="0" value={experience} onChange={(event) => setExperience(event.target.value)} className="w-full rounded-xl border border-border bg-input px-3 py-2 text-sm" />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium">Performance</span>
                <input type="number" min="0" max="100" value={performanceScore} onChange={(event) => setPerformanceScore(event.target.value)} className="w-full rounded-xl border border-border bg-input px-3 py-2 text-sm" />
              </label>
            </div>
            <label className="space-y-2">
              <span className="text-sm font-medium">Specialization</span>
              <input value={specialization} onChange={(event) => setSpecialization(event.target.value)} className="w-full rounded-xl border border-border bg-input px-3 py-2 text-sm" />
            </label>
          </div>
          <div className="mt-6 flex items-center justify-end gap-3">
            <button type="button" onClick={closeModal} className="rounded-xl border border-border px-4 py-2 text-sm text-muted-foreground">
              Cancel
            </button>
            <button type="button" onClick={handleSaveAgent} disabled={isSaving} className="rounded-xl bg-[image:var(--gradient-primary)] px-4 py-2 text-sm font-medium text-primary-foreground">
              {currentAgent ? "Save changes" : "Add agent"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default AgentsPage;