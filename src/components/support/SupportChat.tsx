import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, LogOut, MessageCircle, Send, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import {
  getGuestSupportChat,
  getSupportChat,
  leaveGuestSupportChat,
  leaveSupportChat,
  saveGuestSupportContactEmail,
  saveSupportContactEmail,
  restartSupportChat,
  sendGuestSupportMessage,
  sendSupportMessage,
  startGuestSupportChat,
  type SupportConversation,
  type SupportMessage,
} from "@/lib/support-chat.functions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { AGENT_MESSAGE_EVENT, WELCOME_MESSAGE_EVENT, trackVisitorEvent, type AgentMessageDetail, type WelcomeMessageDetail } from "@/lib/visitor-tracking";

function addMessages(current: SupportMessage[], incoming: SupportMessage[]) {
  const known = new Set(current.map((message) => message.id));
  return [...current, ...incoming.filter((message) => !known.has(message.id))].sort(
    (a, b) => a.created_at.localeCompare(b.created_at),
  );
}

function playPing() {
  try {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const start = ctx.currentTime;
    [[880, 0], [1318, 0.12]].forEach(([frequency, offset]) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, start + offset);
      gain.gain.exponentialRampToValueAtTime(0.15, start + offset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + offset + 0.25);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start + offset);
      osc.stop(start + offset + 0.3);
    });
    window.setTimeout(() => void ctx.close(), 800);
  } catch {
    // Browsers may block audio until the visitor has interacted with the page.
  }
}

const GUEST_TOKEN_KEY = "kodarai_support_guest_token";
const AGENT_SEEN_KEY = "kodarai_support_agent_seen";
const WELCOME_KEY = "kodarai_support_welcome";

/** `raised` lifts the bubble on mobile for pages with a fixed bottom CTA bar (e.g. /start). */
export function SupportChat({ raised = false }: { raised?: boolean } = {}) {
  const { user, loading: authLoading } = useAuth();
  const runGetChat = useServerFn(getSupportChat);
  const runSendMessage = useServerFn(sendSupportMessage);
  const runStartGuestChat = useServerFn(startGuestSupportChat);
  const runGetGuestChat = useServerFn(getGuestSupportChat);
  const runSendGuestMessage = useServerFn(sendGuestSupportMessage);
  const runSaveContactEmail = useServerFn(saveSupportContactEmail);
  const runSaveGuestContactEmail = useServerFn(saveGuestSupportContactEmail);
  const runLeaveChat = useServerFn(leaveSupportChat);
  const runLeaveGuestChat = useServerFn(leaveGuestSupportChat);
  const runRestartChat = useServerFn(restartSupportChat);
  const [open, setOpen] = useState(false);
  const [conversation, setConversation] = useState<SupportConversation | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [visitorToken, setVisitorToken] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [restarting, setRestarting] = useState(false);
  const [contactEmail, setContactEmail] = useState("");
  const [savingContact, setSavingContact] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [hasUnread, setHasUnread] = useState(false);
  const [popup, setPopup] = useState<{ id: string; content: string } | null>(null);
  const [welcome, setWelcome] = useState<string | null>(null);
  const openRef = useRef(false);
  const lastPoppedRef = useRef<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    let active = true;

    const load = async () => {
      setLoading(true);
      const result = user
        ? await runGetChat()
        : await (async () => {
          const savedToken = window.localStorage.getItem(GUEST_TOKEN_KEY);
          if (savedToken) {
            const existing = await runGetGuestChat({ data: { visitorToken: savedToken } });
            if (!("error" in existing)) return { ...existing, visitorToken: savedToken };
          }
          const created = await runStartGuestChat({ data: { visitorToken: savedToken ?? undefined } });
          if (!("error" in created)) window.localStorage.setItem(GUEST_TOKEN_KEY, created.visitorToken);
          return created;
        })();
      if (!active) return;
      if ("error" in result) toast.error(result.error);
      else {
        setConversation(result.conversation);
        setMessages(result.messages);
        if ("visitorToken" in result && typeof result.visitorToken === "string") {
          setVisitorToken(result.visitorToken);
        }
      }
      setLoading(false);
    };

    load();
    return () => { active = false; };
  }, [open, user?.id]);

  useEffect(() => {
    if (!open || user || !visitorToken) return;
    let active = true;
    const refresh = async () => {
      const result = await runGetGuestChat({ data: { visitorToken } });
      if (!active) return;
      if ("error" in result) {
        window.localStorage.removeItem(GUEST_TOKEN_KEY);
        setConversation(null);
        setMessages([]);
        setVisitorToken(null);
        setOpen(false);
        return;
      }
      setConversation(result.conversation);
      setMessages(result.messages);
    };
    const interval = window.setInterval(refresh, 5_000);
    return () => { active = false; window.clearInterval(interval); };
  }, [open, user?.id, visitorToken]);

  useEffect(() => {
    if (!open || !user) return;
    let active = true;
    const refresh = async () => {
      const result = await runGetChat();
      if (!active || "error" in result) return;
      setConversation(result.conversation);
      setMessages(result.messages);
    };
    const interval = window.setInterval(refresh, 5_000);
    return () => { active = false; window.clearInterval(interval); };
  }, [open, user?.id]);

  useEffect(() => {
    if (!user || !conversation) return;
    const channel = supabase
      .channel(`support-chat-${conversation.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "support_messages",
          filter: `conversation_id=eq.${conversation.id}`,
        },
        (payload) => setMessages((current) => addMessages(current, [payload.new as SupportMessage])),
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [conversation?.id, user?.id]);

  useEffect(() => {
    openRef.current = open;
    if (open) {
      setHasUnread(false);
      setPopup(null);
      trackVisitorEvent("chat_opened");
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const latestAgent = [...messages].reverse().find((message) => message.sender === "agent");
    if (latestAgent) window.localStorage.setItem(AGENT_SEEN_KEY, latestAgent.created_at);
  }, [messages, open]);

  // Guests have no realtime channel. The visitor heartbeat (VisitorTracker) broadcasts new human replies;
  // we pop them out like a live-chat bubble when the widget is closed.
  useEffect(() => {
    if (user || authLoading) return;
    const onAgentMessage = (event: Event) => {
      const agent = (event as CustomEvent<AgentMessageDetail>).detail;
      if (!agent || openRef.current || lastPoppedRef.current === agent.id) return;
      const seen = window.localStorage.getItem(AGENT_SEEN_KEY) ?? "";
      if (agent.created_at <= seen) return;
      lastPoppedRef.current = agent.id;
      setHasUnread(true);
      setPopup({ id: agent.id, content: agent.content });
      playPing();
    };
    window.addEventListener(AGENT_MESSAGE_EVENT, onAgentMessage);
    return () => window.removeEventListener(AGENT_MESSAGE_EVENT, onAgentMessage);
  }, [user?.id, authLoading]);

  // Automatic welcome for new guests: pop it out like a live-chat bubble and keep it as the first message in the chat.
  useEffect(() => {
    if (user || authLoading) return;
    try { setWelcome(window.localStorage.getItem(WELCOME_KEY)); } catch { /* storage unavailable */ }
    const onWelcome = (event: Event) => {
      const detail = (event as CustomEvent<WelcomeMessageDetail>).detail;
      if (!detail?.content) return;
      try { window.localStorage.setItem(WELCOME_KEY, detail.content); } catch { /* storage unavailable */ }
      setWelcome(detail.content);
      if (openRef.current) return;
      setHasUnread(true);
      setPopup({ id: detail.id, content: detail.content });
      playPing();
    };
    window.addEventListener(WELCOME_MESSAGE_EVENT, onWelcome);
    return () => window.removeEventListener(WELCOME_MESSAGE_EVENT, onWelcome);
  }, [user?.id, authLoading]);

  useEffect(() => {
    if (open) messagesEndRef.current?.scrollIntoView({ block: "end" });
  }, [messages, open]);

  const waitingForAgent = conversation?.status === "human" && !conversation.agent_replied_at;

  useEffect(() => {
    if (!waitingForAgent) return;
    const interval = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(interval);
  }, [waitingForAgent]);

  const send = async (quickMessage?: string) => {
    const text = (quickMessage ?? content).trim();
    if (!text || sending) return;

    setSending(true);
    if (!quickMessage) setContent("");
    const result = user
      ? await runSendMessage({ data: { content: text } })
      : visitorToken
        ? await runSendGuestMessage({ data: { visitorToken, content: text } })
        : { error: "Starting your guest chat. Please try again." };
    setSending(false);
    if ("error" in result) {
      if (!quickMessage) setContent(text);
      toast.error(result.error);
      return;
    }

    setConversation(result.conversation);
    setMessages((current) => addMessages(current, result.messages));
  };

  const saveContactEmail = async () => {
    const email = contactEmail.trim();
    if (!email || savingContact) return;
    setSavingContact(true);
    const result = user
      ? await runSaveContactEmail({ data: { email } })
      : visitorToken
        ? await runSaveGuestContactEmail({ data: { visitorToken, email } })
        : { error: "Starting your guest chat. Please try again." };
    setSavingContact(false);
    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    setConversation(result.conversation);
    setContactEmail("");
    toast.success("Email saved for the support team.");
  };

  const leaveChat = async () => {
    if (!conversation || leaving) return;
    setLeaving(true);
    const result = user
      ? await runLeaveChat()
      : visitorToken
        ? await runLeaveGuestChat({ data: { visitorToken } })
        : { error: "Unable to end this chat." };
    setLeaving(false);
    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    if (!user) window.localStorage.removeItem(GUEST_TOKEN_KEY);
    setConversation(null);
    setMessages([]);
    setVisitorToken(null);
    setOpen(false);
    toast.success("Chat ended.");
  };

  const startNewChat = async () => {
    if (restarting) return;
    setRestarting(true);
    const result = user
      ? await runRestartChat()
      : await runStartGuestChat();
    setRestarting(false);
    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    if ("visitorToken" in result && typeof result.visitorToken === "string") {
      window.localStorage.setItem(GUEST_TOKEN_KEY, result.visitorToken);
      setVisitorToken(result.visitorToken);
    }
    setConversation(result.conversation);
    setMessages(result.messages);
  };

  const handoffWaitMs = conversation?.human_requested_at
    ? Math.max(0, now - new Date(conversation.human_requested_at).getTime())
    : 0;
  const showContactForm = waitingForAgent && handoffWaitMs >= 3 * 60 * 1000 && !conversation?.contact_email;
  const chatClosed = conversation?.status === "closed";

  if (authLoading) return null;

  return (
    <>
      <Button
        type="button"
        variant="hero"
        size="icon"
        onClick={() => setOpen(true)}
        className={`fixed ${raised ? "bottom-28" : "bottom-20"} right-5 z-40 size-12 rounded-full shadow-lg md:bottom-6 md:right-6`}
        aria-label={hasUnread ? "Open support chat (new reply)" : "Open support chat"}
      >
        <MessageCircle className="size-5" />
        {hasUnread && <span className="absolute right-0.5 top-0.5 size-3 rounded-full border-2 border-background bg-red-500" />}
      </Button>

      {popup && !open && (
        <div className={`fixed ${raised ? "bottom-44" : "bottom-36"} right-5 z-40 w-72 max-w-[calc(100vw-2.5rem)] animate-in fade-in slide-in-from-bottom-2 duration-300 md:bottom-20 md:right-6`}>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="block w-full rounded-2xl border border-border bg-card p-3 pr-8 text-left shadow-xl"
          >
            <div className="mb-1 flex items-center gap-2">
              <span className="flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <MessageCircle className="size-3.5" />
              </span>
              <span className="text-xs font-semibold">KodarAI Support</span>
              <span className="text-[10px] text-muted-foreground">just now</span>
            </div>
            <p className="line-clamp-5 text-sm text-foreground">{popup.content}</p>
            <span className="mt-2 block text-xs font-medium text-primary">Tap to reply</span>
          </button>
          <button
            type="button"
            onClick={() => setPopup(null)}
            className="absolute right-1.5 top-1.5 rounded-full p-1 text-muted-foreground hover:bg-muted"
            aria-label="Dismiss message"
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md overflow-hidden p-0 sm:max-w-md">
          <DialogHeader className="border-b border-border px-5 py-4 pr-12 text-left">
            <div className="flex items-center justify-between gap-3">
              <div>
                <DialogTitle className="text-base">KodarAI Support</DialogTitle>
                <DialogDescription className="text-xs">{user ? "hello@kodarai.xyz" : "Guest chat - hello@kodarai.xyz"}</DialogDescription>
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={leaveChat} disabled={!conversation || leaving} className="mr-6 shrink-0" aria-label="End chat" title="End chat">
                {leaving ? <Loader2 className="size-4 animate-spin" /> : <LogOut className="size-4" />}
              </Button>
            </div>
          </DialogHeader>

          {loading ? (
            <div className="flex h-72 items-center justify-center text-sm text-muted-foreground">
              <Loader2 className="mr-2 size-4 animate-spin" /> Loading conversation
            </div>
          ) : chatClosed ? (
            <div className="flex h-72 flex-col items-center justify-center gap-3 px-6 text-center">
              <p className="text-sm font-medium">This chat has ended.</p>
              <p className="text-xs text-muted-foreground">Start a new conversation whenever you need help.</p>
              <Button type="button" size="sm" onClick={startNewChat} disabled={restarting}>
                {restarting && <Loader2 className="size-4 animate-spin" />} Start new chat
              </Button>
            </div>
          ) : (
            <>
              <div className="h-72 space-y-3 overflow-y-auto px-5 py-4">
                {!user && messages.length === 0 && (
                  <p className="text-center text-xs text-muted-foreground">You are chatting as a guest.</p>
                )}
                {!user && welcome && (
                  <div className="flex justify-start">
                    <div className="max-w-[85%] rounded-lg bg-muted px-3 py-2 text-sm leading-relaxed text-foreground">{welcome}</div>
                  </div>
                )}
                {messages.length === 0 && !(welcome && !user) && (
                  <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
                    Ask about finding leads, billing, Studio, or virtual numbers. Say "human" to request a reply from the team.
                  </div>
                )}
                {messages.map((message) => {
                  const isUser = message.sender === "user";
                  return (
                    <div key={message.id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm leading-relaxed ${
                        isUser ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                      }`}>
                        {message.content}
                      </div>
                    </div>
                  );
                })}
                {waitingForAgent && (
                  <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Loader2 className="size-4 animate-spin text-primary" />
                      <span>Waiting for an agent to pick this up.</span>
                    </div>
                    {showContactForm && (
                      <div className="mt-3 space-y-2">
                        <p className="text-xs leading-relaxed">Please hold while we connect you. Leave an email and the team can follow up even if you close this chat.</p>
                        <form className="flex gap-2" onSubmit={(event) => { event.preventDefault(); saveContactEmail(); }}>
                          <Input type="email" value={contactEmail} onChange={(event) => setContactEmail(event.target.value)} placeholder="you@example.com" disabled={savingContact} />
                          <Button type="submit" size="sm" disabled={!contactEmail.trim() || savingContact}>Save</Button>
                        </form>
                      </div>
                    )}
                    {conversation?.contact_email && (
                      <p className="mt-2 text-xs">We have your email and will follow up there if needed.</p>
                    )}
                    <div className="mt-3 flex flex-wrap gap-2">
                      {["Help me find leads", "Help me build a site", "Billing help", "Virtual number help"].map((prompt) => (
                        <Button key={prompt} type="button" variant="outline" size="sm" onClick={() => send(prompt)} disabled={sending}>
                          {prompt}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              <form
                className="flex gap-2 border-t border-border p-3"
                onSubmit={(event) => { event.preventDefault(); send(); }}
              >
                <Input
                  value={content}
                  onChange={(event) => setContent(event.target.value)}
                  placeholder="Write a message..."
                  maxLength={2000}
                  disabled={sending}
                />
                <Button type="submit" size="icon" disabled={!content.trim() || sending} aria-label="Send message">
                  {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                </Button>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
