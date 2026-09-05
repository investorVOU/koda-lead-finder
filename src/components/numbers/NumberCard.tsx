import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  CheckCircle2, Clock, Trash2, Loader2,
  MessageSquare, Send, Zap, BarChart3, Settings2,
  Edit3, Check, X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { releaseNumber } from "@/lib/numbers.functions";
import { updateNumberLabel } from "@/lib/numbers-extra.functions";
import { SmsInbox } from "@/components/numbers/SmsInbox";
import { OutboundSMS } from "@/components/numbers/OutboundSMS";
import { SMSTemplates } from "@/components/numbers/SMSTemplates";
import { NumberAnalytics } from "@/components/numbers/NumberAnalytics";
import { NumberSettings } from "@/components/numbers/NumberSettings";
import { NUMBER_COUNTRIES } from "@/lib/numbers";
import type { VirtualNumber } from "@/lib/numbers";

type CardTab = "inbox" | "send" | "templates" | "analytics" | "settings";

interface Props {
  number: VirtualNumber;
  fxRate?: number;
  onDeleted: (id: string) => void;
  onUpdated: (id: string, updates: Partial<VirtualNumber>) => void;
}

export function NumberCard({ number: initialNumber, fxRate = 1600, onDeleted, onUpdated }: Props) {
  const runRelease     = useServerFn(releaseNumber);
  const runUpdateLabel = useServerFn(updateNumberLabel);

  const [number,    setNumber]    = useState(initialNumber);
  const [tab,       setTab]       = useState<CardTab | null>(null);
  const [releasing, setReleasing] = useState(false);

  // Inline label editing
  const [editingLabel, setEditingLabel] = useState(false);
  const [labelDraft,   setLabelDraft]   = useState(number.label ?? "");
  const [savingLabel,  setSavingLabel]  = useState(false);

  const countryCode = String(number.country_code ?? "").toUpperCase();
  const countryInfo = NUMBER_COUNTRIES.find((c) => c.code === countryCode);
  const flag = countryInfo?.flag ?? "🌐";

  const handleRelease = async () => {
    if (!confirm(`Release ${number.phone_number}? This cannot be undone.`)) return;
    setReleasing(true);
    const res = await runRelease({ data: { numberId: number.id } });
    setReleasing(false);
    if ("error" in res) { toast.error(res.message); return; }
    toast.success("Number released.");
    onDeleted(number.id);
  };

  const saveLabel = async () => {
    setSavingLabel(true);
    const res = await runUpdateLabel({ data: { numberId: number.id, label: labelDraft.trim() || null } });
    setSavingLabel(false);
    if ("error" in res) { toast.error(res.message); return; }
    const updated = { ...number, label: labelDraft.trim() || null };
    setNumber(updated);
    onUpdated(number.id, { label: updated.label });
    setEditingLabel(false);
  };

  const handleUpdate = (updates: Partial<VirtualNumber>) => {
    const updated = { ...number, ...updates };
    setNumber(updated);
    onUpdated(number.id, updates);
  };

  const tabConfig = (
    [
      { id: "inbox"     as CardTab, icon: <MessageSquare className="size-3.5" />, label: "Inbox" },
      { id: "send"      as CardTab, icon: <Send className="size-3.5" />,          label: "Send",     hide: number.provider !== "telnyx" },
      { id: "templates" as CardTab, icon: <Zap className="size-3.5" />,           label: "Templates", hide: number.provider !== "telnyx" },
      { id: "analytics" as CardTab, icon: <BarChart3 className="size-3.5" />,     label: "Analytics" },
      { id: "settings"  as CardTab, icon: <Settings2 className="size-3.5" />,     label: "Settings" },
    ] as Array<{ id: CardTab; icon: React.ReactNode; label: string; hide?: boolean }>
  ).filter((t) => !t.hide);

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-3 px-5 py-4">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-2xl shrink-0">{flag}</span>
          <div className="min-w-0">
            <p className="font-mono text-base font-bold">{number.phone_number}</p>

            {/* Label (inline edit) */}
            {editingLabel ? (
              <div className="mt-0.5 flex items-center gap-1">
                <input
                  autoFocus
                  type="text"
                  value={labelDraft}
                  onChange={(e) => setLabelDraft(e.target.value)}
                  maxLength={50}
                  onKeyDown={(e) => { if (e.key === "Enter") saveLabel(); if (e.key === "Escape") setEditingLabel(false); }}
                  className="rounded border border-border bg-background px-1.5 py-0.5 text-xs outline-none"
                />
                <button onClick={saveLabel} disabled={savingLabel} className="text-emerald-600">
                  {savingLabel ? <Loader2 className="size-3 animate-spin" /> : <Check className="size-3" />}
                </button>
                <button onClick={() => setEditingLabel(false)} className="text-muted-foreground"><X className="size-3" /></button>
              </div>
            ) : (
              <div className="mt-0.5 flex items-center gap-1.5">
                {number.status === "active" ? (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
                    <CheckCircle2 className="size-3" /> Active
                  </span>
                ) : number.status === "expired" ? (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-zinc-400">
                    <Clock className="size-3" /> Expired
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-500">
                    <Clock className="size-3" /> Pending
                  </span>
                )}
                {number.expires_at && number.status === "active" && (
                  <span className="text-xs text-muted-foreground">
                    · Expires {new Date(number.expires_at).toLocaleDateString()}
                    {number.auto_renew && <span className="ml-1 text-primary">↻</span>}
                  </span>
                )}
                {number.label && (
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                    {number.label}
                  </span>
                )}
                <button
                  onClick={() => { setLabelDraft(number.label ?? ""); setEditingLabel(true); }}
                  className="text-muted-foreground/50 hover:text-muted-foreground"
                  title="Edit label"
                >
                  <Edit3 className="size-3" />
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {number.call_forward_enabled && number.call_forward_to && (
            <span className="hidden rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground sm:block">
              📞 → {number.call_forward_to}
            </span>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="size-8 text-destructive"
            onClick={handleRelease}
            disabled={releasing}
          >
            {releasing ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
          </Button>
        </div>
      </div>

      {/* ── Tab bar ── */}
      <div className="border-t border-border px-2">
        <div className="flex gap-0.5 overflow-x-auto py-1">
          {tabConfig.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(tab === t.id ? null : t.id)}
              className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                tab === t.id
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab content ── */}
      {tab && (
        <div className="border-t border-border px-5 py-4">
          {tab === "inbox" && (
            <SmsInbox
              numberId={number.id}
              phoneNumber={number.phone_number}
              provider={number.provider ?? "telnyx"}
            />
          )}
          {tab === "send" && number.provider === "telnyx" && (
            <OutboundSMS numberId={number.id} fromNumber={number.phone_number} />
          )}
          {tab === "templates" && number.provider === "telnyx" && (
            <SMSTemplates />
          )}
          {tab === "analytics" && (
            <NumberAnalytics numberId={number.id} />
          )}
          {tab === "settings" && (
            <NumberSettings
              number={number}
              fxRate={fxRate}
              onUpdated={handleUpdate}
            />
          )}
        </div>
      )}
    </div>
  );
}
