import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Zap, Plus, MessageSquare, Bot, User, Send, Sparkles } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { conversationService } from '@/services';
import { queryKeys } from '@/api/query-keys';
import { useConversations, useCustomers, useQueryClient, useToast } from '@/hooks';

const AI_PROMPTS = [
  "I'd like to schedule a property tour for this Saturday",
  "Can you send me more details about the 3BHK apartment?",
  "What are the payment options available?",
  "Is the property still available?",
  "I want to negotiate the price",
  "Can I visit the property tomorrow morning?",
];


function AiBotPage() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { data: conversations = [], isLoading } = useConversations();
  const { data: customers = [] } = useCustomers();

  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [isNewOpen, setIsNewOpen] = useState(false);
  const [customerId, setCustomerId] = useState("");
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [isReplying, setIsReplying] = useState(false);
  const threadRef = useRef<HTMLDivElement>(null);

  const sorted = useMemo(
    () => [...conversations].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    [conversations]
  );

  const activeConv = sorted.find((c) => c.id === activeConvId) ?? sorted[0] ?? null;

  useEffect(() => {
    if (threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight;
  }, [activeConv?.messages?.length]);

  const handleCreateConversation = async () => {
    if (!customerId || !message.trim()) {
      toast.error("Please select a customer and enter a message.");
      return;
    }
    setIsSending(true);
    try {
      const created = await conversationService.createConversation({
        customerId,
        messages: [{ from: "customer", text: message.trim() }],
      });
      // Request AI response immediately
      await conversationService.addMessage(created.id, {
        text: message.trim(),
        from: "customer",
        withAiResponse: true,
      });
      await queryClient.invalidateQueries({ queryKey: queryKeys.conversations.list() });
      setIsNewOpen(false);
      setCustomerId("");
      setMessage("");
      setActiveConvId(created.id);
      toast.success("AI conversation started successfully.");
    } catch (error) {
      toast.fromApiError(error, "Unable to start AI conversation.");
    } finally {
      setIsSending(false);
    }
  };

  const handleSendAiReply = async () => {
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
            <h1 className="text-3xl font-bold tracking-tight">AI Assistant</h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/15 border border-primary/30 text-primary text-xs font-semibold">
              <Zap className="size-3" />
              Smart Responses
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {isLoading ? "Loading conversations…" : "AI-powered conversation management for customer inquiries"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsNewOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[image:var(--gradient-primary)] text-primary-foreground text-sm font-medium shadow-[var(--shadow-glow)]"
        >
          <Plus className="size-4" aria-hidden />
          Start Conversation
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Conversations", value: conversations.length, icon: MessageSquare },
          { label: "AI Responses", value: conversations.reduce((a, c) => a + (c.messages?.filter((m) => m.from === "agent")?.length ?? 0), 0), icon: Bot },
          { label: "Customers Engaged", value: new Set(conversations.map((c) => c.customerId)).size, icon: User },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="glass-card rounded-2xl p-5 flex items-center gap-4">
            <div className="size-12 rounded-xl bg-primary/10 grid place-items-center">
              <Icon className="size-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold tabular-nums">{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Main panel */}
      <div className="glass-card rounded-2xl overflow-hidden" style={{ minHeight: "500px", display: "grid", gridTemplateColumns: sorted.length > 0 ? "280px 1fr" : "1fr" }}>
        {/* Left: conversation list */}
        {sorted.length > 0 && (
          <div className="border-r border-border flex flex-col">
            <div className="px-4 py-3 border-b border-border bg-muted text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Recent Conversations
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-border">
              {sorted.map((conv) => {
                const name = conv.customer?.name ?? customers.find((c) => c.id === conv.customerId)?.name ?? "Customer";
                const lastMsg = conv.messages?.[conv.messages.length - 1];
                const isActive = conv.id === activeConv?.id;
                return (
                  <button
                    key={conv.id}
                    type="button"
                    onClick={() => setActiveConvId(conv.id)}
                    className={`w-full text-left px-4 py-3 flex gap-2.5 items-start hover:bg-accent/40 transition-colors ${isActive ? "bg-primary/10 border-l-2 border-l-primary" : ""}`}
                  >
                    <div className="size-8 rounded-full bg-[image:var(--gradient-primary)] grid place-items-center text-xs font-semibold text-primary-foreground flex-shrink-0">
                      {name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{name}</p>
                      {lastMsg && <p className="text-xs text-muted-foreground truncate">{lastMsg.text}</p>}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Right: active thread */}
        {activeConv ? (
          <div className="flex flex-col min-h-0">
            <div className="px-5 py-3.5 border-b border-border bg-muted/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="size-9 rounded-full bg-[image:var(--gradient-primary)] grid place-items-center text-xs font-semibold text-primary-foreground">
                  {(activeConv.customer?.name ?? "?").slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-semibold">{activeConv.customer?.name ?? "Customer"}</p>
                  <div className="flex items-center gap-1 text-[10px] text-primary/80">
                    <Bot className="size-3" />
                    {activeConv.aiSummary ?? "AI-assisted conversation"}
                  </div>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-medium">
                <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                AI Active
              </span>
            </div>

            <div ref={threadRef} className="flex-1 overflow-y-auto p-5 space-y-4" style={{ maxHeight: "340px" }}>
              {activeConv.messages.map((msg, i) => {
                const isAgent = msg.from === "agent";
                return (
                  <div key={i} className={`flex gap-2.5 ${isAgent ? "flex-row-reverse" : ""}`}>
                    <div className={`size-8 rounded-full grid place-items-center text-xs font-semibold flex-shrink-0 ${isAgent ? "bg-[image:var(--gradient-primary)] text-primary-foreground" : "bg-muted"}`}>
                      {isAgent ? <Bot className="size-4" /> : <User className="size-4" />}
                    </div>
                    <div className={`max-w-[68%] flex flex-col gap-1 ${isAgent ? "items-end" : "items-start"}`}>
                      <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${isAgent ? "bg-[image:var(--gradient-primary)] text-primary-foreground rounded-tr-sm" : "bg-muted rounded-tl-sm"}`}>
                        {msg.text}
                      </div>
                      <span className="text-[10px] text-muted-foreground px-1">
                        {isAgent ? "AI Agent" : "Customer"}
                        {msg.timestamp ? ` · ${new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : ""}
                      </span>
                    </div>
                  </div>
                );
              })}
              {isReplying && (
                <div className="flex gap-2.5">
                  <div className="size-8 rounded-full bg-muted grid place-items-center flex-shrink-0">
                    <User className="size-4" />
                  </div>
                  <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-2.5">
                    <div className="flex gap-1">
                      {[0.1, 0.2, 0.3].map((d) => (
                        <span key={d} className="size-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: `${d}s` }} />
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Quick prompts */}
            <div className="px-5 py-2 border-t border-border overflow-x-auto">
              <div className="flex gap-2 w-max">
                {AI_PROMPTS.slice(0, 3).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setReplyText(p)}
                    className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 border-t border-border bg-background/50">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendAiReply(); } }}
                  placeholder="Simulate a customer message to get an AI response…"
                  className="flex-1 h-10 px-4 rounded-xl bg-input border border-border text-sm"
                />
                <button
                  type="button"
                  onClick={handleSendAiReply}
                  disabled={isReplying || !replyText.trim()}
                  className="h-10 px-4 rounded-xl bg-[image:var(--gradient-primary)] text-primary-foreground text-sm font-medium disabled:opacity-50 inline-flex items-center gap-2"
                >
                  <Send className="size-4" />
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1">
                <Sparkles className="size-3" />
                Messages from customer trigger an AI-generated agent response automatically
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-center p-12">
            <div className="size-16 rounded-2xl bg-primary/10 grid place-items-center mb-4">
              <Bot className="size-8 text-primary" />
            </div>
            <p className="font-semibold text-lg">No conversations yet</p>
            <p className="text-sm text-muted-foreground mt-2 max-w-xs">
              Start a new conversation with a customer and the AI will generate intelligent responses automatically.
            </p>
            <button
              type="button"
              onClick={() => setIsNewOpen(true)}
              className="mt-6 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[image:var(--gradient-primary)] text-primary-foreground text-sm font-medium"
            >
              <Plus className="size-4" /> Start First Conversation
            </button>
          </div>
        )}
      </div>

      {/* New Conversation Dialog */}
      <Dialog open={isNewOpen} onOpenChange={setIsNewOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bot className="size-5 text-primary" />
              Start AI Conversation
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-3">
            <label className="space-y-2 block">
              <span className="text-sm font-medium">Customer</span>
              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="w-full rounded-xl border border-border bg-input px-3 py-2 text-sm"
              >
                <option value="">Select customer…</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} — {c.email}</option>
                ))}
              </select>
            </label>
            <label className="space-y-2 block">
              <span className="text-sm font-medium">Customer's Message</span>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                placeholder="e.g. 'I'd like to schedule a property tour for this Saturday'"
                className="w-full rounded-xl border border-border bg-input px-3 py-2 text-sm resize-none"
              />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <p className="col-span-2 text-xs text-muted-foreground font-medium">Quick prompts:</p>
              {AI_PROMPTS.slice(0, 4).map((p) => (
                <button key={p} type="button" onClick={() => setMessage(p)} className="text-left px-2.5 py-2 rounded-lg bg-primary/10 border border-primary/20 text-primary text-xs font-medium hover:bg-primary/20 transition-colors">
                  {p}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-4 flex items-center justify-end gap-3">
            <button type="button" onClick={() => setIsNewOpen(false)} className="rounded-xl border border-border px-4 py-2 text-sm text-muted-foreground">
              Cancel
            </button>
            <button
              type="button"
              disabled={isSending}
              onClick={handleCreateConversation}
              className="rounded-xl bg-[image:var(--gradient-primary)] px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60 inline-flex items-center gap-2"
            >
              {isSending ? "Starting…" : <><Sparkles className="size-4" /> Start with AI</>}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default AiBotPage;