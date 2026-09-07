import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Send, Loader2, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { sendOutboundSMS, getTemplates } from "@/lib/numbers-extra.functions";
import type { SmsTemplate } from "@/lib/numbers";

interface Props {
  numberId: string;
  fromNumber: string;
}

export function OutboundSMS({ numberId, fromNumber }: Props) {
  const runSend        = useServerFn(sendOutboundSMS);
  const runGetTemplates = useServerFn(getTemplates);

  const [to,           setTo]           = useState("");
  const [body,         setBody]         = useState("");
  const [sending,      setSending]      = useState(false);
  const [templates,    setTemplates]    = useState<SmsTemplate[] | null>(null);
  const [showTpl,      setShowTpl]      = useState(false);
  const [loadingTpls,  setLoadingTpls]  = useState(false);

  const loadTemplates = async () => {
    if (templates !== null) { setShowTpl((v) => !v); return; }
    setLoadingTpls(true);
    const res = await runGetTemplates();
    setLoadingTpls(false);
    if ("templates" in res) { setTemplates(res.templates as SmsTemplate[]); setShowTpl(true); }
  };

  const send = async () => {
    if (!to.trim() || !body.trim()) { toast.error("Enter a recipient and message"); return; }
    setSending(true);
    const res = await runSend({ data: { numberId, to: to.trim(), body: body.trim() } });
    setSending(false);
    if ("error" in res) { toast.error("Something went wrong. Please try again."); return; }
    toast.success("SMS sent!");
    setBody("");
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">From</label>
        <p className="rounded-xl border border-border bg-muted/40 px-3 py-2 font-mono text-sm text-muted-foreground">
          {fromNumber}
        </p>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">To (phone number)</label>
        <input
          type="tel"
          placeholder="+12025551234"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-muted-foreground">Message</label>
          <button
            onClick={loadTemplates}
            className="flex items-center gap-1 text-xs text-primary hover:underline"
          >
            {loadingTpls ? <Loader2 className="size-3 animate-spin" /> : <ChevronDown className="size-3" />}
            Templates
          </button>
        </div>

        {showTpl && templates && templates.length > 0 && (
          <div className="rounded-xl border border-border bg-card p-2 space-y-1">
            {templates.map((t) => (
              <button
                key={t.id}
                onClick={() => { setBody(t.body); setShowTpl(false); }}
                className="flex w-full flex-col gap-0.5 rounded-lg px-3 py-2 text-left hover:bg-accent"
              >
                <span className="text-xs font-semibold">{t.name}</span>
                <span className="text-xs text-muted-foreground line-clamp-1">{t.body}</span>
              </button>
            ))}
          </div>
        )}
        {showTpl && templates?.length === 0 && (
          <p className="text-xs text-muted-foreground py-1">No templates yet. Create some in the Templates tab.</p>
        )}

        <textarea
          placeholder="Type your message here…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={4}
          maxLength={1600}
          className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
        />
        <p className="text-right text-[10px] text-muted-foreground">{body.length}/1600</p>
      </div>

      <Button variant="hero" className="w-full" onClick={send} disabled={sending || !to || !body}>
        {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
        {sending ? "Sending…" : "Send SMS"}
      </Button>
    </div>
  );
}
