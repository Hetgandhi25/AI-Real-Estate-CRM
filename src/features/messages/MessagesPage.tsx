import React, { useState, useEffect, useRef } from 'react';
import { Plus, MessageSquare, Bot, User, Send, Search } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { conversationService } from '@/services';
import { queryKeys } from '@/api/query-keys';
import { useConversations, useCustomers, useQueryClient, useToast, useDebounce } from '@/hooks';

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function MessagesPage() {
  const queryClient = useQueryClient();
  const toast = useToast();
  
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);

  const { data: conversations = [], isLoading } = useConversations({ search: debouncedSearch || undefined });
  const { data: customers = [] } = useCustomers();

  const [activeId, setActiveId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isNewOpen, setIsNewOpen] = useState(false);
  const [newCustomerId, setNewCustomerId] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const threadRef = useRef<HTMLDivElement>(null);

  // Load search from URL query parameter if any on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const searchParam = params.get("search");
    if (searchParam) {
      setSearch(searchParam);
    }
  }, []);

  const activeConversation = conversations.find((c) => c.id === activeId) ?? null;

  // Auto-scroll thread to bottom on new messages
  useEffect(() => {
    if (threadRef.current) {
      threadRef.current.scrollTop = threadRef.current.scrollHeight;
    }
  }, [activeConversation?.messages?.length]);

  // Connect to Socket.IO for real-time conversation updates
  useEffect(() => {
    const socketUrl = import.meta.env.VITE_API_BASE_URL
      ? new URL(import.meta.env.VITE_API_BASE_URL).origin
      : "http://localhost:4000";

    console.log(`🔌 Connecting to Socket.IO server at: ${socketUrl}`);
    
    let socket: any = null;
    import("socket.io-client").then(({ io }) => {
      socket = io(socketUrl, {
        withCredentials: true,
      });

      socket.on("connect", () => {
        console.log("🔌 Socket.IO connected to backend successfully!");
      });

      socket.on("conversation:updated", (data: { conversationId: string; customerId: string }) => {
        console.log("📡 Received conversation:updated event via Socket.IO:", data);
        queryClient.invalidateQueries({ queryKey: queryKeys.conversations.list() });
      });

      socket.on("disconnect", () => {
        console.log("🔌 Socket.IO disconnected from backend.");
      });
    }).catch(err => {
      console.error("❌ Failed to load socket.io-client:", err);
    });

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [queryClient]);

  const handleSendReply = async () => {
    if (!activeId || !replyText.trim()) return;
    setIsSending(true);
    try {
      await conversationService.addMessage(activeId, {
        text: replyText.trim(),
        from: "agent",
        withAiResponse: false,
      });
      setReplyText("");
      await queryClient.invalidateQueries({ queryKey: queryKeys.conversations.list() });
    } catch (error) {
      toast.fromApiError(error, "Failed to send message");
    } finally {
      setIsSending(false);
    }
  };

  const handleCreateConversation = async () => {
    if (!newCustomerId || !newMessage.trim()) {
      toast.error("Please select a customer and enter an initial message.");
      return;
    }
    setIsCreating(true);
    try {
      const created = await conversationService.createConversation({
        customerId: newCustomerId,
        messages: [{ from: "agent", text: newMessage.trim() }],
      });
      await queryClient.invalidateQueries({ queryKey: queryKeys.conversations.list() });
      setIsNewOpen(false);
      setNewCustomerId("");
      setNewMessage("");
      setActiveId(created.id);
      toast.success("Conversation created");
    } catch (error) {
      toast.fromApiError(error, "Failed to create conversation");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Messages</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isLoading ? "Loading conversations…" : `${conversations.length} customer conversation${conversations.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsNewOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[image:var(--gradient-primary)] text-primary-foreground text-sm font-medium shadow-[var(--shadow-glow)]"
        >
          <Plus className="size-4" aria-hidden />
          New Conversation
        </button>
      </div>

      {/* Two-panel layout */}
      <div className="glass-card rounded-2xl overflow-hidden" style={{ minHeight: "520px", display: "grid", gridTemplateColumns: activeConversation ? "320px 1fr" : "1fr" }}>
        {/* Left panel — conversation list */}
        <div className={`border-r border-border flex flex-col ${activeConversation ? "" : "col-span-1"}`}>
          <div className="px-4 py-3 border-b border-border bg-muted text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Conversations
          </div>
          <div className="p-3 border-b border-border bg-card/30">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                placeholder="Search messages, summary, name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-10 pl-9 pr-3 rounded-xl bg-input border border-border text-xs focus:outline-none focus:ring-2 focus:ring-ring/40"
              />
            </div>
          </div>
          {isLoading ? (
            <div className="p-3 space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="animate-pulse flex gap-3 p-3">
                  <div className="size-9 rounded-full bg-muted flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 bg-muted rounded w-2/3" />
                    <div className="h-3 bg-muted rounded w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center flex-1 py-12 text-center px-4">
              <MessageSquare className="size-10 text-muted-foreground mb-3" />
              <p className="text-sm font-medium">No conversations yet</p>
              <p className="text-xs text-muted-foreground mt-1">Start by creating a new conversation.</p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto divide-y divide-border">
              {conversations.map((conv) => {
                const customerName = conv.customer?.name ?? customers.find((c) => c.id === conv.customerId)?.name ?? "Unknown Customer";
                const lastMsg = conv.messages?.[conv.messages.length - 1];
                const isActive = conv.id === activeId;
                return (
                  <button
                    key={conv.id}
                    type="button"
                    onClick={() => setActiveId(conv.id)}
                    className={`w-full text-left px-4 py-3.5 flex gap-3 items-start hover:bg-accent/50 transition-colors ${isActive ? "bg-primary/10 border-l-2 border-l-primary" : ""}`}
                  >
                    <div className="size-9 rounded-full bg-[image:var(--gradient-primary)] grid place-items-center text-xs font-semibold text-primary-foreground flex-shrink-0">
                      {customerName.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-sm font-medium truncate">{customerName}</span>
                        <span className="text-[10px] text-muted-foreground flex-shrink-0">{timeAgo(conv.updatedAt)}</span>
                      </div>
                      {lastMsg && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          <span className="font-medium capitalize">{lastMsg.from}:</span> {lastMsg.text}
                        </p>
                      )}
                      {conv.aiSummary && (
                        <p className="text-[10px] text-primary/70 mt-1 truncate flex items-center gap-1">
                          <Bot className="size-2.5" /> {conv.aiSummary.slice(0, 60)}…
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right panel — active thread */}
        {activeConversation && (
          <div className="flex flex-col min-h-0">
            {/* Thread header */}
            <div className="px-5 py-3.5 border-b border-border bg-muted/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="size-9 rounded-full bg-[image:var(--gradient-primary)] grid place-items-center text-xs font-semibold text-primary-foreground">
                  {(activeConversation.customer?.name ?? "??").slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-semibold">
                    {activeConversation.customer?.name ?? customers.find((c) => c.id === activeConversation.customerId)?.name ?? "Customer"}
                  </p>
                  {activeConversation.customer?.email && (
                    <p className="text-xs text-muted-foreground">{activeConversation.customer.email}</p>
                  )}
                </div>
              </div>
              {activeConversation.aiSummary && (
                <div className="hidden md:flex items-center gap-2 text-xs text-primary/80 bg-primary/10 px-3 py-1.5 rounded-full max-w-xs">
                  <Bot className="size-3 flex-shrink-0" />
                  <span className="truncate">{activeConversation.aiSummary}</span>
                </div>
              )}
            </div>

            {/* Messages thread */}
            <div ref={threadRef} className="flex-1 overflow-y-auto p-5 space-y-4" style={{ maxHeight: "380px" }}>
              {activeConversation.messages.map((msg, index) => {
                const isAgent = msg.from === "agent";
                const isCustomer = msg.from === "customer";
                return (
                  <div key={index} className={`flex gap-2.5 ${isAgent ? "flex-row-reverse" : ""}`}>
                    <div className={`size-8 rounded-full grid place-items-center text-xs font-semibold flex-shrink-0 ${isAgent ? "bg-[image:var(--gradient-primary)] text-primary-foreground" : "bg-muted text-foreground"}`}>
                      {isAgent ? <User className="size-4" /> : (activeConversation.customer?.name ?? "C").slice(0, 1).toUpperCase()}
                    </div>
                    <div className={`max-w-[70%] ${isAgent ? "items-end" : "items-start"} flex flex-col gap-1`}>
                      <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${isAgent ? "bg-[image:var(--gradient-primary)] text-primary-foreground rounded-tr-sm" : "bg-muted text-foreground rounded-tl-sm"}`}>
                        {msg.text}
                      </div>
                      <span className="text-[10px] text-muted-foreground px-1">
                        {msg.from === "agent" ? "Agent" : "Customer"}
                        {msg.timestamp ? ` · ${new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : ""}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Reply input */}
            <div className="p-4 border-t border-border bg-background/50">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendReply(); } }}
                  placeholder="Type a reply…"
                  className="flex-1 h-10 px-4 rounded-xl bg-input border border-border text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <button
                  type="button"
                  onClick={handleSendReply}
                  disabled={isSending || !replyText.trim()}
                  className="h-10 px-4 rounded-xl bg-[image:var(--gradient-primary)] text-primary-foreground text-sm font-medium disabled:opacity-50 inline-flex items-center gap-2"
                >
                  <Send className="size-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Placeholder when no conversation selected */}
        {!activeConversation && conversations.length > 0 && (
          <div className="hidden" />
        )}
      </div>

      {/* New Conversation Dialog */}
      <Dialog open={isNewOpen} onOpenChange={setIsNewOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New Conversation</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-3">
            <label className="space-y-2 block">
              <span className="text-sm font-medium">Customer</span>
              <select
                value={newCustomerId}
                onChange={(e) => setNewCustomerId(e.target.value)}
                className="w-full rounded-xl border border-border bg-input px-3 py-2 text-sm"
              >
                <option value="">Select customer…</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} — {c.email}</option>
                ))}
              </select>
            </label>
            <label className="space-y-2 block">
              <span className="text-sm font-medium">Initial Message</span>
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                rows={4}
                placeholder="Type your first message to the customer…"
                className="w-full rounded-xl border border-border bg-input px-3 py-2 text-sm resize-none"
              />
            </label>
          </div>
          <div className="mt-4 flex items-center justify-end gap-3">
            <button type="button" onClick={() => setIsNewOpen(false)} className="rounded-xl border border-border px-4 py-2 text-sm text-muted-foreground">
              Cancel
            </button>
            <button
              type="button"
              disabled={isCreating}
              onClick={handleCreateConversation}
              className="rounded-xl bg-[image:var(--gradient-primary)] px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
            >
              {isCreating ? "Creating…" : "Start Conversation"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default MessagesPage;