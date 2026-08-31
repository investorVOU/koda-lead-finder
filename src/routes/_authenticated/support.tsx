import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Bell, CircleDot, Clock3, Inbox, Loader2, MessageCircle, Search, Send, ShieldCheck, XCircle } from "lucide-react";
import { toast } from "sonner";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  closeSupportConversationByAdmin,
  getSupportAdminAccess,
  getSupportInbox,
  getSupportInboxMessages,
  getSupportPushConfig,
  replyToSupportConversation,
  saveSupportPushSubscription,
  type SupportInboxConversation,
  type SupportMessage,
} from "@/lib/support-chat.functions";

export const Route = createFileRoute("/_authenticated/support")({
  head: () => ({ meta: [{ title: "Support Inbox - Kodarai" }] }),
  component: SupportInboxPage,
});

function urlBase64ToUint8Array(value: string) {
  const padding = "=".repeat((4 - value.length % 4) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
}

function SupportInboxPage() {
  const navigate = useNavigate();
  const runCheckAccess = useServerFn(getSupportAdminAccess);
  const runGetInbox = useServerFn(getSupportInbox);
  const runGetMessages = useServerFn(getSupportInboxMessages);
  const runReply = useServerFn(replyToSupportConversation);
  const runCloseConversation = useServerFn(closeSupportConversationByAdmin);
  const runGetPushConfig = useServerFn(getSupportPushConfig);
  const runSavePushSubscription = useServerFn(saveSupportPushSubscription);
  const [conversations, setConversations] = useState<SupportInboxConversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [activeFilter, setActiveFilter] = useState<"all" | "waiting">("all");
  const [query, setQuery] = useState("");
  const [enablingAlerts, setEnablingAlerts] = useState(false);
  const [alertsEnabled, setAlertsEnabled] = useState(false);
  const [closingConversation, setClosingConversation] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const loadInbox = async () => {
    const result = await runGetInbox();
    if ("error" in result) {
      setError(result.error);
      setConversations([]);
      return;
    }
    setError(null);
    setConversations(result.conversations);
    setSelectedId((current) => current && result.conversations.some((item) => item.id === current)
      ? current
      : result.conversations[0]?.id ?? null);
  };

  useEffect(() => {
    let active = true;
    runCheckAccess().then((result) => {
      if (!active) return;
      if (!result.authorized) {
        navigate({ to: "/dashboard", replace: true });
        return;
      }
      setAuthorized(true);
    }).catch(() => navigate({ to: "/dashboard", replace: true }));
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!authorized) return;
    setLoading(true);
    loadInbox().finally(() => setLoading(false));
    const interval = window.setInterval(loadInbox, 5_000);
    return () => window.clearInterval(interval);
  }, [authorized]);

  useEffect(() => {
    if (!authorized) return;
    if (!selectedId) {
      setMessages([]);
      return;
    }
    let active = true;
    setLoadingMessages(true);
    runGetMessages({ data: { conversationId: selectedId } }).then((result) => {
      if (!active) return;
      if ("error" in result) setError(result.error);
      else setMessages(result.messages);
      setLoadingMessages(false);
    });
    return () => { active = false; };
  }, [authorized, selectedId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ block: "end" });
  }, [messages, selectedId]);

  const reply = async () => {
    const text = content.trim();
    if (!selectedId || !text || sending) return;
    setSending(true);
    const result = await runReply({ data: { conversationId: selectedId, content: text } });
    setSending(false);
    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    setContent("");
    setMessages((current) => [...current, result.message]);
    loadInbox();
  };

  const enableAlerts = async () => {
    if (!window.isSecureContext) {
      toast.error("Push notifications require the secure https:// version of this site.");
      return;
    }
    if (!("serviceWorker" in navigator) || !("Notification" in window)) {
      toast.error("Push notifications are unavailable in this browser session.");
      return;
    }
    setEnablingAlerts(true);
    try {
      const config = await runGetPushConfig();
      if ("error" in config) throw new Error(config.error);
      const registration = await navigator.serviceWorker.register("/support-push-sw.js");
      if (!registration.pushManager) throw new Error("Push notifications are unavailable in this browser session.");
      const permission = await Notification.requestPermission();
      if (permission !== "granted") throw new Error("Notification permission was not granted.");
      const existing = await registration.pushManager.getSubscription();
      const subscription = existing || await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(config.publicKey),
      });
      const payload = subscription.toJSON();
      const result = await runSavePushSubscription({
        data: { endpoint: subscription.endpoint, p256dh: payload.keys?.p256dh ?? "", auth: payload.keys?.auth ?? "" },
      });
      if ("error" in result) throw new Error(result.error);
      setAlertsEnabled(true);
      toast.success("Support alerts enabled on this device.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not enable alerts.");
    } finally {
      setEnablingAlerts(false);
    }
  };

  const closeConversation = async () => {
    if (!selectedId || closingConversation) return;
    setClosingConversation(true);
    const result = await runCloseConversation({ data: { conversationId: selectedId } });
    setClosingConversation(false);
    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    setConversations((current) => current.filter((conversation) => conversation.id !== selectedId));
    setSelectedId(null);
    setMessages([]);
    toast.success("Conversation closed and cleared.");
  };

  const waitingConversations = useMemo(
    () => conversations.filter((conversation) => conversation.status === "human" && !conversation.agent_replied_at),
    [conversations],
  );
  const filteredConversations = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const source = activeFilter === "waiting" ? waitingConversations : conversations;
    if (!normalizedQuery) return source;
    return source.filter((conversation) =>
      `${conversation.customer_name} ${conversation.customer_email}`.toLowerCase().includes(normalizedQuery),
    );
  }, [activeFilter, conversations, query, waitingConversations]);
  const selected = filteredConversations.find((conversation) => conversation.id === selectedId);

  useEffect(() => {
    if (selectedId && filteredConversations.some((conversation) => conversation.id === selectedId)) return;
    setSelectedId(filteredConversations[0]?.id ?? null);
  }, [filteredConversations, selectedId]);

  if (authorized !== true) {
    return (
      <DashboardShell>
        <div className="flex min-h-[60vh] items-center justify-center text-sm text-muted-foreground">
          <Loader2 className="mr-2 size-4 animate-spin" /> Opening secure inbox
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <div className="mx-auto w-full max-w-[1440px]">
        {loading ? (
          <div className="flex min-h-64 items-center justify-center text-sm text-muted-foreground">
            <Loader2 className="mr-2 size-4 animate-spin" /> Loading inbox
          </div>
        ) : error ? (
          <div className="border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{error}</div>
        ) : (
          <div className="grid min-h-[680px] overflow-hidden rounded-xl border border-border bg-background lg:grid-cols-[13rem_20rem_minmax(0,1fr)]">
            <aside className="flex flex-col border-b border-border bg-muted/20 p-4 lg:border-b-0 lg:border-r">
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                  <ShieldCheck className="size-3.5" /> Operator
                </div>
                <h1 className="mt-3 text-xl font-semibold tracking-tight">Support Inbox</h1>
                <p className="mt-1 text-sm leading-5 text-muted-foreground">Customer conversations for Kodarai.</p>
              </div>
              <nav className="mt-7 space-y-1" aria-label="Support inbox views">
                <button type="button" onClick={() => setActiveFilter("all")} className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors ${activeFilter === "all" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:bg-background/70 hover:text-foreground"}`}>
                  <span className="flex items-center gap-2"><Inbox className="size-4" /> All conversations</span><span className="text-xs tabular-nums">{conversations.length}</span>
                </button>
                <button type="button" onClick={() => setActiveFilter("waiting")} className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors ${activeFilter === "waiting" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:bg-background/70 hover:text-foreground"}`}>
                  <span className="flex items-center gap-2"><Clock3 className="size-4" /> Awaiting reply</span>
                  <span className={`rounded-full px-1.5 py-0.5 text-[11px] tabular-nums ${waitingConversations.length ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{waitingConversations.length}</span>
                </button>
              </nav>
              <div className="mt-auto border-t border-border pt-4">
                <Button variant="outline" size="sm" className="w-full" onClick={enableAlerts} disabled={enablingAlerts || alertsEnabled}>
                  {enablingAlerts ? <Loader2 className="size-4 animate-spin" /> : <Bell className="size-4" />}
                  {alertsEnabled ? "Alerts enabled" : "Enable alerts"}
                </Button>
                <p className="mt-3 text-xs leading-5 text-muted-foreground">Alerts are sent only for conversations awaiting a human reply.</p>
              </div>
            </aside>

            <aside className="border-b border-border lg:border-b-0 lg:border-r">
              <div className="space-y-3 border-b border-border p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">Conversations</p>
                  <span className="text-xs text-muted-foreground">{filteredConversations.length}</span>
                </div>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search customers" className="pl-9" />
                </div>
              </div>
              <div className="max-h-72 overflow-y-auto p-2 lg:max-h-[628px]">
                {filteredConversations.length === 0 ? (
                  <p className="px-3 py-8 text-center text-sm text-muted-foreground">
                    {query ? "No matching conversations." : "No customer conversations yet."}
                  </p>
                ) : filteredConversations.map((conversation) => {
                  const awaitingReply = conversation.status === "human" && !conversation.agent_replied_at;
                  return (
                  <button
                    key={conversation.id}
                    type="button"
                    onClick={() => setSelectedId(conversation.id)}
                    className={`w-full rounded-md px-3 py-3 text-left transition-colors ${
                      selectedId === conversation.id ? "bg-primary/10" : "hover:bg-accent"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-foreground">
                        {conversation.customer_name.slice(0, 1).toUpperCase()}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-medium text-foreground">{conversation.customer_name}</span>
                          <CircleDot className={`size-3 shrink-0 ${awaitingReply ? "text-primary" : "text-muted-foreground"}`} />
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-muted-foreground">{conversation.customer_email}</span>
                        <span className={`mt-1.5 block text-[11px] font-medium ${awaitingReply ? "text-primary" : "text-muted-foreground"}`}>{awaitingReply ? "New message" : "In progress"}</span>
                      </span>
                    </div>
                  </button>
                  );
                })}
              </div>
            </aside>

            <section className="flex min-h-80 flex-col">
              {selected ? (
                <>
                  {waitingConversations.length > 0 && (
                    <button type="button" onClick={() => { setActiveFilter("waiting"); setSelectedId(waitingConversations[0]?.id ?? null); }} className="flex w-full items-center justify-between gap-3 border-b border-primary/20 bg-primary/5 px-5 py-2.5 text-left text-sm text-primary">
                      <span><strong>{waitingConversations.length} new customer message{waitingConversations.length === 1 ? "" : "s"}</strong> waiting for a reply.</span>
                      <span className="shrink-0 text-xs font-semibold">Review</span>
                    </button>
                  )}
                  <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                        {selected.customer_name.slice(0, 1).toUpperCase()}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{selected.customer_name}</p>
                        <p className="truncate text-xs text-muted-foreground">{selected.customer_email}</p>
                      </div>
                    </div>
                    <span className="hidden items-center gap-1.5 text-xs font-medium text-muted-foreground sm:flex"><span className="size-2 rounded-full bg-primary" /> {selected.status === "human" && !selected.agent_replied_at ? "New message" : "Conversation open"}</span>
                    <Button type="button" variant="ghost" size="icon" onClick={closeConversation} disabled={closingConversation} aria-label="Close and clear conversation" title="Close and clear conversation">
                      {closingConversation ? <Loader2 className="size-4 animate-spin" /> : <XCircle className="size-4" />}
                    </Button>
                  </div>
                  <div className="flex-1 space-y-4 overflow-y-auto bg-muted/15 p-5">
                    {loadingMessages ? (
                      <div className="flex items-center text-sm text-muted-foreground"><Loader2 className="mr-2 size-4 animate-spin" /> Loading messages</div>
                    ) : messages.map((message) => {
                      const isAgent = message.sender === "agent";
                      const senderLabel = isAgent ? "You" : message.sender === "bot" ? "KodarAI assistant" : selected.customer_name;
                      return (
                        <div key={message.id} className={`flex ${isAgent ? "justify-end" : "justify-start"}`}>
                          <div className="max-w-[82%]">
                            <p className={`mb-1 text-[11px] font-medium ${isAgent ? "text-right text-muted-foreground" : "text-muted-foreground"}`}>{senderLabel}</p>
                            <div className={`rounded-lg px-3 py-2.5 text-sm leading-relaxed ${
                              isAgent ? "bg-primary text-primary-foreground" : message.sender === "bot" ? "border border-border bg-background" : "bg-muted"
                            }`}>
                              {message.content}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                  <form className="flex items-end gap-2 border-t border-border bg-background p-3" onSubmit={(event) => { event.preventDefault(); reply(); }}>
                      <Textarea value={content} onChange={(event) => setContent(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); reply(); } }} placeholder="Reply as hello@kodarai.xyz" disabled={sending} className="min-h-11 max-h-32 resize-none" rows={1} />
                      <Button type="submit" size="icon" disabled={!content.trim() || sending} aria-label="Send reply" className="shrink-0">
                        {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                      </Button>
                  </form>
                </>
              ) : (
                <div className="flex flex-1 flex-col items-center justify-center text-sm text-muted-foreground">
                  <MessageCircle className="mb-3 size-7" /> Select a conversation to reply.
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
