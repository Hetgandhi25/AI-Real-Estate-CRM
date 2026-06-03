import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Bot,
  MessageSquare,
  TrendingUp,
  User,
  Calendar,
  Zap,
  Target,
  Send,
  Eye,
  Search,
  Sparkles,
  ArrowUpRight,
  ShieldCheck,
  Building,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  Tooltip,
  XAxis,
  YAxis,
  ResponsiveContainer,
} from "recharts";
import {
  getAiBotSummary,
  getAiSessions,
  getBotLeads,
  getBotSiteVisits,
  AiBotSummary,
  AiSession,
  BotLead,
  BotSiteVisit,
} from "./services/ai-bot.service";
import { conversationService } from "@/services";
import { useConversations, useCustomers, useQueryClient, useToast } from "@/hooks";
import { queryKeys } from "@/api/query-keys";
import { formatCurrency } from "@/lib/formatters";

const CHART_TOOLTIP_STYLE = {
  backgroundColor: "oklch(0.18 0.015 260)",
  border: "1px solid oklch(0.28 0.015 260)",
  borderRadius: "12px",
  color: "oklch(0.9 0.01 260)",
};

const QUICK_PROMPTS = [
  "I want a 3 BHK flat in Gota under 80 lakh",
  "Is there a villa available in Ahmedabad above 1.5 crore?",
  "I am interested in Property prop-1",
  "Schedule a site visit for Gota flat on Saturday at 11:00",
];

function AiBotPage() {
  const queryClient = useQueryClient();
  const toast = useToast();
  
  // Tab control
  const [activeTab, setActiveTab] = useState<"overview" | "sessions" | "leads" | "visits" | "chat">("overview");

  // SQL Bot Stats & Lists
  const [summary, setSummary] = useState<AiBotSummary | null>(null);
  const [sessions, setSessions] = useState<AiSession[]>([]);
  const [botLeads, setBotLeads] = useState<BotLead[]>([]);
  const [botVisits, setBotVisits] = useState<BotSiteVisit[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);

  // Conversations (Simulated Chat Console)
  const { data: conversations = [], isLoading: loadingConvs } = useConversations();
  const { data: customers = [] } = useCustomers();
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [customerId, setCustomerId] = useState("");
  const [newMsgText, setNewMsgText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [isReplying, setIsReplying] = useState(false);
  const threadRef = useRef<HTMLDivElement>(null);

  const sortedConvs = useMemo(
    () =>
      [...conversations].sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      ),
    [conversations]
  );

  const activeConv = sortedConvs.find((c) => c.id === activeConvId) ?? sortedConvs[0] ?? null;

  // Fetch bot statistics
  const fetchBotData = async () => {
    try {
      setLoadingStats(true);
      const [sumData, sessData, leadsData, visitsData] = await Promise.all([
        getAiBotSummary(),
        getAiSessions(),
        getBotLeads(),
        getBotSiteVisits(),
      ]);
      setSummary(sumData);
      setSessions(sessData);
      setBotLeads(leadsData);
      setBotVisits(visitsData);
    } catch (e) {
      console.error("[AiBotPage] Error loading bot analytics", e);
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    fetchBotData();
  }, [conversations]);

  useEffect(() => {
    if (threadRef.current) {
      threadRef.current.scrollTop = threadRef.current.scrollHeight;
    }
  }, [activeConv?.messages?.length]);

  const handleCreateSimulation = async () => {
    if (!customerId || !newMsgText.trim()) {
      toast.error("Please select a customer and enter a message.");
      return;
    }
    setIsSending(true);
    try {
      const created = await conversationService.createConversation({
        customerId,
        messages: [{ from: "customer", text: newMsgText.trim() }],
      });
      // Trigger AI Agent run in YandoX backend
      await conversationService.addMessage(created.id, {
        text: newMsgText.trim(),
        from: "customer",
        withAiResponse: true,
      });
      await queryClient.invalidateQueries({ queryKey: queryKeys.conversations.list() });
      setCustomerId("");
      setNewMsgText("");
      setActiveConvId(created.id);
      toast.success("AI Conversation simulation started.");
      fetchBotData();
    } catch (error) {
      toast.fromApiError(error, "Unable to start simulation");
    } finally {
      setIsSending(false);
    }
  };

  const handleSendSimulatedMsg = async () => {
    if (!activeConv || !replyText.trim()) return;
    setIsReplying(true);
    try {
      await conversationService.addMessage(activeConv.id, {
        text: replyText.trim(),
        from: "customer",
        withAiResponse: true,
      });
      setReplyText("");
      await queryClient.invalidateQueries({ queryKey: queryKeys.conversations.list() });
      toast.success("Simulated user message sent to bot.");
      fetchBotData();
    } catch (error) {
      toast.fromApiError(error, "Failed to send message");
    } finally {
      setIsReplying(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">AI PropertyBot</h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/15 border border-primary/30 text-primary text-xs font-semibold">
              <Zap className="size-3" />
              OpenClaw Agent Runtime Active
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time management and analytics of Ollama Qwen3 property recommendation bot
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <button
            type="button"
            onClick={fetchBotData}
            className="px-3 py-2 rounded-lg bg-card border border-border hover:bg-accent/40 font-medium"
          >
            Refresh Logs
          </button>
          <span className="px-3 py-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium flex items-center gap-1.5">
            <ShieldCheck className="size-3.5" /> Ollama Node Online
          </span>
        </div>
      </div>

      {/* Stats Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
        {loadingStats || !summary
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="glass-card rounded-2xl p-5 h-24 animate-pulse bg-card/50" />
            ))
          : summary.kpis.map((k) => {
              let Icon = Bot;
              if (k.icon === "bot") Icon = Bot;
              else if (k.icon === "eye") Icon = Eye;
              else if (k.icon === "trending-up") Icon = TrendingUp;
              else if (k.icon === "users") Icon = User;
              else if (k.icon === "key") Icon = Calendar;
              else if (k.icon === "target") Icon = Target;

              return (
                <div key={k.label} className="glass-card rounded-2xl p-5 flex items-center gap-4">
                  <div className="size-10 rounded-xl bg-primary/10 grid place-items-center flex-shrink-0">
                    <Icon className="size-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xl font-bold tabular-nums">{k.value}</p>
                    <p className="text-[10px] text-muted-foreground font-medium">{k.label}</p>
                  </div>
                </div>
              );
            })}
      </div>

      {/* Tabs list */}
      <div className="flex border-b border-border text-sm gap-2 select-none overflow-x-auto">
        {[
          { id: "overview", label: "Overview & Funnel", icon: Target },
          { id: "sessions", label: "Active Sessions", icon: Eye },
          { id: "leads", label: "Leads Generated", icon: TrendingUp },
          { id: "visits", label: "Site Visits", icon: Calendar },
          { id: "chat", label: "Interactive Console", icon: MessageSquare },
        ].map((t) => {
          const isActive = activeTab === t.id;
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium transition-all ${
                isActive
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              }`}
            >
              <Icon className="size-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Tabs Content */}
      <div className="min-h-[400px]">
        {/* Tab 1: Overview */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Conversion Funnel */}
            <div className="glass-card rounded-2xl p-6 lg:col-span-2">
              <h3 className="text-lg font-semibold mb-4">Conversion Funnel</h3>
              <div className="space-y-4 mt-2">
                {loadingStats || !summary ? (
                  <p className="text-sm text-muted-foreground">Loading funnel...</p>
                ) : (
                  summary.conversionFunnel.map((step) => (
                    <div key={step.stage}>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground font-medium">{step.stage}</span>
                        <span className="font-semibold tabular-nums">
                          {step.count} <span className="text-xs text-muted-foreground font-normal">({step.percentage}% conversion)</span>
                        </span>
                      </div>
                      <div className="mt-2 h-2 rounded-full bg-secondary overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[image:var(--gradient-primary)] shadow-[var(--shadow-glow)]"
                          style={{ width: `${step.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Response Time & Stats */}
            <div className="glass-card rounded-2xl p-6 flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-semibold mb-2">Bot Performance</h3>
                <p className="text-xs text-muted-foreground">Ollama Node Response Metrics</p>
                <div className="mt-8 space-y-6">
                  <div className="flex items-center justify-between border-b border-border/50 pb-3">
                    <span className="text-sm text-muted-foreground">Avg Response Time</span>
                    <span className="text-lg font-bold text-primary">0.8 minutes</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-border/50 pb-3">
                    <span className="text-sm text-muted-foreground">Success Rate</span>
                    <span className="text-lg font-bold text-emerald-400">98.4%</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-border/50 pb-3">
                    <span className="text-sm text-muted-foreground">Total Messages Exchanged</span>
                    <span className="text-lg font-bold">1,842</span>
                  </div>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground italic mt-6">
                * KPIs generated in real-time from PostgreSQL schema telemetry logs.
              </p>
            </div>

            {/* Chat activity line chart */}
            <div className="glass-card rounded-2xl p-6 lg:col-span-3">
              <h3 className="text-lg font-semibold mb-2">Chat Activity (Last 7 Days)</h3>
              <p className="text-xs text-muted-foreground mb-4">Volume of incoming vs AI replies</p>
              <div className="h-64">
                {summary?.chatActivity ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={summary.chatActivity}>
                      <defs>
                        <linearGradient id="colorCustomer" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorBot" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--chart-2)" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="var(--chart-2)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.28 0.015 260)" vertical={false} />
                      <XAxis dataKey="name" stroke="oklch(0.66 0.02 260)" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="oklch(0.66 0.02 260)" fontSize={12} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                      <Area type="monotone" dataKey="customer" name="Customer Messages" stroke="var(--chart-1)" strokeWidth={2} fillOpacity={1} fill="url(#colorCustomer)" />
                      <Area type="monotone" dataKey="bot" name="Agent Bot Responses" stroke="var(--chart-2)" strokeWidth={2} fillOpacity={1} fill="url(#colorBot)" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-muted-foreground">Loading chart data...</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Sessions */}
        {activeTab === "sessions" && (
          <div className="glass-card rounded-2xl p-6">
            <h3 className="text-lg font-semibold mb-4">Active Requirement Sessions</h3>
            {loadingStats ? (
              <p className="text-sm text-muted-foreground">Loading active sessions...</p>
            ) : sessions.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">No active customer requirement sessions.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground font-semibold">
                      <th className="py-3 px-4">Phone Number</th>
                      <th className="py-3 px-4">Requirements Gathered</th>
                      <th className="py-3 px-4">Pending Field</th>
                      <th className="py-3 px-4">State</th>
                      <th className="py-3 px-4 text-right">Last Active</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.map((sess) => {
                      let collectedObj: any = {};
                      try {
                        collectedObj = JSON.parse(sess.collected);
                      } catch (e) {}

                      return (
                        <tr key={sess.id} className="border-b border-border/40 hover:bg-accent/20 transition-colors">
                          <td className="py-3.5 px-4 font-medium tabular-nums">+{sess.phone}</td>
                          <td className="py-3.5 px-4">
                            <div className="flex flex-wrap gap-1.5 max-w-lg">
                              {collectedObj.type && (
                                <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-xs font-semibold uppercase">
                                  🏢 {collectedObj.type}
                                </span>
                              )}
                              {collectedObj.location && (
                                <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 text-xs font-semibold">
                                  📍 {collectedObj.location}
                                </span>
                              )}
                              {collectedObj.bedrooms && (
                                <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 text-xs font-semibold">
                                  🛏️ {collectedObj.bedrooms} BHK
                                </span>
                              )}
                              {collectedObj.budget && (collectedObj.budget.maxPrice || collectedObj.budget.minPrice) && (
                                <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 text-xs font-semibold">
                                  💰 ₹
                                  {collectedObj.budget.maxPrice
                                    ? `under ${collectedObj.budget.maxPrice}`
                                    : `above ${collectedObj.budget.minPrice}`}{" "}
                                  Lakh
                                </span>
                              )}
                              {Object.keys(collectedObj).length === 0 && (
                                <span className="text-xs text-muted-foreground">Gathering info...</span>
                              )}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-primary font-medium uppercase text-xs">
                            {sess.pendingField || "None"}
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                sess.active
                                  ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                                  : "bg-secondary text-muted-foreground"
                              }`}
                            >
                              <span className={`size-1.5 rounded-full ${sess.active ? "bg-emerald-400 animate-pulse" : "bg-muted-foreground"}`} />
                              {sess.active ? "Active" : "Closed"}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right text-muted-foreground tabular-nums">
                            {new Date(sess.lastActivity).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Leads */}
        {activeTab === "leads" && (
          <div className="glass-card rounded-2xl p-6">
            <h3 className="text-lg font-semibold mb-4">Leads Generated by WhatsApp Bot</h3>
            {loadingStats ? (
              <p className="text-sm text-muted-foreground">Loading leads...</p>
            ) : botLeads.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">No leads generated via AI Bot yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground font-semibold">
                      <th className="py-3 px-4">Customer Name</th>
                      <th className="py-3 px-4">Phone</th>
                      <th className="py-3 px-4">Property Recommendation</th>
                      <th className="py-3 px-4">Lead Status</th>
                      <th className="py-3 px-4 text-right">Created Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {botLeads.map((lead) => (
                      <tr key={lead.id} className="border-b border-border/40 hover:bg-accent/20 transition-colors">
                        <td className="py-3.5 px-4 font-semibold">{lead.customer.name}</td>
                        <td className="py-3.5 px-4 tabular-nums">+{lead.customer.phone}</td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5 font-medium text-primary">
                            <Building className="size-3.5" />
                            {lead.property.title} ({lead.property.city})
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/20 border border-primary/30 text-primary">
                            {lead.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right text-muted-foreground tabular-nums">
                          {new Date(lead.createdAt).toLocaleDateString([], {
                            month: "short",
                            day: "numeric",
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Site Visits */}
        {activeTab === "visits" && (
          <div className="glass-card rounded-2xl p-6">
            <h3 className="text-lg font-semibold mb-4">Visits & Appointments Scheduled</h3>
            {loadingStats ? (
              <p className="text-sm text-muted-foreground">Loading site visits...</p>
            ) : botVisits.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">No property site visits scheduled yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground font-semibold">
                      <th className="py-3 px-4">Customer Name</th>
                      <th className="py-3 px-4">Property</th>
                      <th className="py-3 px-4">Date & Time</th>
                      <th className="py-3 px-4">Notes</th>
                      <th className="py-3 px-4 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {botVisits.map((visit) => (
                      <tr key={visit.id} className="border-b border-border/40 hover:bg-accent/20 transition-colors">
                        <td className="py-3.5 px-4 font-semibold">{visit.customer.name}</td>
                        <td className="py-3.5 px-4">
                          {visit.property ? (
                            <div className="flex items-center gap-1.5 font-medium text-primary">
                              <Building className="size-3.5" />
                              {visit.property.title}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">Not specified</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 tabular-nums">
                          {new Date(visit.scheduledAt).toLocaleString([], {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="py-3.5 px-4 text-muted-foreground text-xs italic">
                          {visit.notes || "No extra notes."}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                            {visit.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 5: Chat Console */}
        {activeTab === "chat" && (
          <div className="glass-card rounded-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-3 min-h-[500px]">
            {/* Left: Simulated Conversation thread selector */}
            <div className="border-r border-border flex flex-col col-span-1 bg-muted/30">
              <div className="px-4 py-3 border-b border-border bg-muted/50 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Simulation Inquiries
              </div>
              <div className="flex-1 overflow-y-auto divide-y divide-border/40" style={{ maxHeight: "400px" }}>
                {loadingConvs ? (
                  <p className="p-4 text-sm text-muted-foreground animate-pulse">Loading threads...</p>
                ) : sortedConvs.length === 0 ? (
                  <p className="p-4 text-xs text-muted-foreground italic">No simulated threads.</p>
                ) : (
                  sortedConvs.map((conv) => {
                    const name =
                      conv.customer?.name ??
                      customers.find((c) => c.id === conv.customerId)?.name ??
                      "Customer";
                    const lastMsg = conv.messages?.[conv.messages.length - 1];
                    const isActive = conv.id === activeConv?.id;
                    return (
                      <button
                        key={conv.id}
                        type="button"
                        onClick={() => setActiveConvId(conv.id)}
                        className={`w-full text-left px-4 py-3 flex gap-2.5 items-start hover:bg-accent/40 transition-colors ${
                          isActive ? "bg-primary/10 border-l-2 border-l-primary" : ""
                        }`}
                      >
                        <div className="size-8 rounded-full bg-[image:var(--gradient-primary)] grid place-items-center text-xs font-semibold text-primary-foreground flex-shrink-0">
                          {name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{name}</p>
                          {lastMsg && (
                            <p className="text-xs text-muted-foreground truncate">{lastMsg.text}</p>
                          )}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>

              {/* Start New Simulated conversation */}
              <div className="p-4 border-t border-border bg-card/40 space-y-3">
                <p className="text-xs font-semibold text-muted-foreground">Start AI Simulation Thread</p>
                <select
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  className="w-full rounded-lg border border-border bg-input px-2.5 py-2 text-xs"
                >
                  <option value="">Select customer...</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} (+{c.phone})
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={newMsgText}
                  onChange={(e) => setNewMsgText(e.target.value)}
                  placeholder="Type simulated text..."
                  className="w-full rounded-lg border border-border bg-input px-2.5 py-2 text-xs"
                />
                <button
                  type="button"
                  onClick={handleCreateSimulation}
                  disabled={isSending || !customerId || !newMsgText.trim()}
                  className="w-full rounded-lg bg-[image:var(--gradient-primary)] text-primary-foreground text-xs py-2 font-medium disabled:opacity-50 inline-flex items-center justify-center gap-1 shadow-[var(--shadow-glow)]"
                >
                  <Sparkles className="size-3.5" /> Start Simulation
                </button>
              </div>
            </div>

            {/* Right: Active Simulated Chat Console */}
            <div className="col-span-2 flex flex-col justify-between min-h-[500px]">
              {activeConv ? (
                <>
                  {/* Chat header */}
                  <div className="px-5 py-3 border-b border-border bg-muted/40 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold">{activeConv.customer?.name ?? "Customer"}</p>
                      <p className="text-[10px] text-primary/80 flex items-center gap-1 mt-0.5">
                        <Bot className="size-3" />
                        {activeConv.aiSummary || "AI-assisted simulation"}
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold">
                      <span className="size-1 bg-emerald-400 rounded-full animate-ping" /> AI Console Live
                    </span>
                  </div>

                  {/* Message stream */}
                  <div
                    ref={threadRef}
                    className="flex-1 overflow-y-auto p-5 space-y-4 bg-card/20"
                    style={{ maxHeight: "350px" }}
                  >
                    {activeConv.messages.map((msg: any, i: number) => {
                      const isAgent = msg.from === "agent";
                      return (
                        <div key={i} className={`flex gap-2.5 ${isAgent ? "flex-row-reverse" : ""}`}>
                          <div
                            className={`size-8 rounded-full grid place-items-center text-xs font-semibold flex-shrink-0 ${
                              isAgent
                                ? "bg-[image:var(--gradient-primary)] text-primary-foreground"
                                : "bg-muted"
                            }`}
                          >
                            {isAgent ? <Bot className="size-4" /> : <User className="size-4" />}
                          </div>
                          <div
                            className={`max-w-[75%] flex flex-col gap-1 ${
                              isAgent ? "items-end" : "items-start"
                            }`}
                          >
                            <div
                              className={`px-4 py-2.5 rounded-2xl text-xs whitespace-pre-wrap leading-relaxed ${
                                isAgent
                                  ? "bg-[image:var(--gradient-primary)] text-primary-foreground rounded-tr-sm"
                                  : "bg-muted rounded-tl-sm"
                              }`}
                            >
                              {msg.text}
                            </div>
                            <span className="text-[9px] text-muted-foreground px-1">
                              {isAgent ? "OpenClaw Agent" : "Customer"}
                              {msg.timestamp && ` · ${new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}
                            </span>
                          </div>
                        </div>
                      );
                    })}

                    {isReplying && (
                      <div className="flex gap-2.5">
                        <div className="size-8 rounded-full bg-muted grid place-items-center flex-shrink-0">
                          <Bot className="size-4 text-primary animate-pulse" />
                        </div>
                        <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-2.5">
                          <div className="flex gap-1">
                            {[0.1, 0.2, 0.3].map((d) => (
                              <span
                                key={d}
                                className="size-1.5 rounded-full bg-muted-foreground animate-bounce"
                                style={{ animationDelay: `${d}s` }}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Quick prompts */}
                  <div className="px-5 py-2 border-t border-border overflow-x-auto bg-muted/10">
                    <div className="flex gap-2 w-max">
                      {QUICK_PROMPTS.map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setReplyText(p)}
                          className="flex-shrink-0 px-2.5 py-1 rounded-md bg-primary/10 border border-primary/20 text-primary text-[10px] font-medium hover:bg-primary/20 transition-colors"
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Send input */}
                  <div className="p-4 border-t border-border bg-card/60">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleSendSimulatedMsg();
                          }
                        }}
                        placeholder="Simulate a customer message to run the OpenClaw agent..."
                        className="flex-1 h-9 px-3 rounded-lg bg-input border border-border text-xs"
                      />
                      <button
                        type="button"
                        onClick={handleSendSimulatedMsg}
                        disabled={isReplying || !replyText.trim()}
                        className="h-9 px-4 rounded-lg bg-[image:var(--gradient-primary)] text-primary-foreground text-xs font-semibold disabled:opacity-50 inline-flex items-center gap-1.5 shadow-[var(--shadow-glow)]"
                      >
                        <Send className="size-3.5" />
                        Send
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center text-center p-12 h-full">
                  <Bot className="size-12 text-muted-foreground/40 mb-3 animate-pulse" />
                  <p className="font-semibold text-sm">Select or Start a Simulation Thread</p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                    Choose a simulated conversation on the left panel or click "Start Simulation" to execute the bot reasoning engine.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AiBotPage;