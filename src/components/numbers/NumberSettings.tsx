import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Copy, Check, PhoneForwarded, RefreshCw, Tag, Globe, Phone } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  toggleAutoRenew,
  extendNumber,
  setCallForward,
  updateNumberLabel,
} from "@/lib/numbers-extra.functions";
import type { VirtualNumber } from "@/lib/numbers";

interface Props {
  number: VirtualNumber;
  fxRate?: number;
  onUpdated: (updated: Partial<VirtualNumber>) => void;
}

export function NumberSettings({ number, fxRate = 1600, onUpdated }: Props) {
  const runToggleRenew = useServerFn(toggleAutoRenew);
  const runExtend      = useServerFn(extendNumber);
  const runCallFwd     = useServerFn(setCallForward);
  const runUpdateLabel = useServerFn(updateNumberLabel);

  const [label,        setLabel]        = useState(number.label ?? "");
  const [savingLabel,  setSavingLabel]  = useState(false);

  const [autoRenew,    setAutoRenew]    = useState(number.auto_renew ?? false);
  const [togglingRenew,setTogglingRenew] = useState(false);

  const [extending,    setExtending]    = useState(false);

  const [forwardTo,    setForwardTo]    = useState(number.call_forward_to ?? "");
  const [forwardOn,    setForwardOn]    = useState(number.call_forward_enabled ?? false);
  const [savingFwd,    setSavingFwd]    = useState(false);

  const [copiedWebhook, setCopiedWebhook] = useState(false);

  const webhookUrl = "https://kodarai.xyz/api/public/webhooks/sms-incoming";
  const renewPrice = `₦${Math.round(number.monthly_ngn).toLocaleString()}`;

  const saveLabel = async () => {
    setSavingLabel(true);
    const res = await runUpdateLabel({ data: { numberId: number.id, label: label.trim() || null } });
    setSavingLabel(false);
    if ("error" in res) { toast.error(res.message); return; }
    toast.success("Label saved");
    onUpdated({ label: label.trim() || null });
  };

  const handleAutoRenew = async () => {
    setTogglingRenew(true);
    const newVal = !autoRenew;
    const res = await runToggleRenew({ data: { numberId: number.id, autoRenew: newVal } });
    setTogglingRenew(false);
    if ("error" in res) { toast.error(res.message); return; }
    setAutoRenew(newVal);
    onUpdated({ auto_renew: newVal });
    toast.success(newVal ? "Auto-renew enabled" : "Auto-renew disabled");
  };

  const extend = async () => {
    setExtending(true);
    const res = await runExtend({ data: { numberId: number.id } });
    setExtending(false);
    if ("error" in res) { toast.error(res.message); return; }
    toast.success("Number extended by 1 month!");
    if ("expiresAt" in res) onUpdated({ expires_at: res.expiresAt });
  };

  const saveForward = async () => {
    setSavingFwd(true);
    const res = await runCallFwd({
      data: {
        numberId:  number.id,
        forwardTo: forwardTo.trim() || null,
        enabled:   forwardOn && !!forwardTo.trim(),
      },
    });
    setSavingFwd(false);
    if ("error" in res) { toast.error(res.message); return; }
    toast.success("Call forwarding updated");
    onUpdated({ call_forward_to: forwardTo.trim() || null, call_forward_enabled: forwardOn && !!forwardTo.trim() });
  };

  const copyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2000);
  };

  const showWebhookSection = number.provider === "telnyx";

  return (
    <div className="space-y-5">
      {/* Label */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Tag className="size-4 text-muted-foreground" />
          <p className="text-sm font-semibold">Label</p>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="e.g. WhatsApp main, Client account…"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            maxLength={50}
            className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
          />
          <Button size="sm" variant="outline" onClick={saveLabel} disabled={savingLabel}>
            {savingLabel ? <Loader2 className="size-3.5 animate-spin" /> : "Save"}
          </Button>
        </div>
      </div>

      {/* Auto-renew + extend (Telnyx only) */}
      {number.provider === "telnyx" && (
        <div className="space-y-3 rounded-xl border border-border p-4">
          <p className="text-sm font-semibold flex items-center gap-2">
            <RefreshCw className="size-4 text-muted-foreground" /> Renewal
          </p>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm">Auto-renew monthly</p>
              <p className="text-xs text-muted-foreground">Automatically charges wallet before expiry</p>
            </div>
            <button
              onClick={handleAutoRenew}
              disabled={togglingRenew}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${autoRenew ? "bg-primary" : "bg-muted"}`}
            >
              {togglingRenew ? (
                <Loader2 className="absolute inset-0 m-auto size-3.5 animate-spin text-white" />
              ) : (
                <span className={`inline-block size-4 rounded-full bg-white shadow transition-transform ${autoRenew ? "translate-x-6" : "translate-x-1"}`} />
              )}
            </button>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-border">
            <div>
              <p className="text-sm">Extend now (1 month)</p>
              <p className="text-xs text-muted-foreground">Charge {renewPrice} from wallet</p>
            </div>
            <Button size="sm" variant="outline" onClick={extend} disabled={extending}>
              {extending ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
              {extending ? "Extending…" : "Extend"}
            </Button>
          </div>
        </div>
      )}

      {/* Call forwarding (Telnyx only) */}
      {number.provider === "telnyx" && (
        <div className="space-y-3 rounded-xl border border-border p-4">
          <p className="text-sm font-semibold flex items-center gap-2">
            <PhoneForwarded className="size-4 text-muted-foreground" /> Call forwarding
          </p>
          <p className="text-xs text-muted-foreground">
            Incoming voice calls are forwarded to this number. This requires the number to be connected to the provider webhook or call-control setup for your account.
          </p>
          <input
            type="tel"
            placeholder="+2348012345678 (your real number)"
            value={forwardTo}
            onChange={(e) => setForwardTo(e.target.value)}
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
          />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm">Enable forwarding</span>
              <button
                onClick={() => setForwardOn((v) => !v)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${forwardOn ? "bg-primary" : "bg-muted"}`}
              >
                <span className={`inline-block size-4 rounded-full bg-white shadow transition-transform ${forwardOn ? "translate-x-6" : "translate-x-1"}`} />
              </button>
            </div>
            <Button size="sm" variant="outline" onClick={saveForward} disabled={savingFwd}>
              {savingFwd ? <Loader2 className="size-3.5 animate-spin" /> : "Save"}
            </Button>
          </div>
        </div>
      )}

      {/* Webhook URL */}
      {showWebhookSection && (
        <div className="space-y-2">
          <p className="text-sm font-semibold flex items-center gap-2">
            <Globe className="size-4 text-muted-foreground" /> Webhook URL
          </p>
          <p className="text-xs text-muted-foreground">
            Paste this URL into your messaging webhook settings to receive SMS on this number. Kodarai will handle provider integration.
          </p>
          <div className="flex gap-2">
            <input
              readOnly
              value={webhookUrl}
              className="flex-1 rounded-xl border border-border bg-muted/40 px-3 py-2 font-mono text-xs text-muted-foreground"
            />
            <button
              onClick={copyWebhook}
              className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-medium hover:bg-accent"
            >
              {copiedWebhook ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
              {copiedWebhook ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>
      )}

      {/* Phone number info */}
      <div className="space-y-2 rounded-xl border border-border bg-muted/30 p-4">
        <p className="text-xs font-medium text-muted-foreground flex items-center gap-2">
          <Phone className="size-3.5" /> Number info
        </p>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <p className="text-muted-foreground">Service</p>
            <p className="font-medium">Kodarai sms</p>
          </div>
          <div>
            <p className="text-muted-foreground">Country</p>
            <p className="font-medium">{number.country_code}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Monthly</p>
            <p className="font-medium">{renewPrice}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Expires</p>
            <p className="font-medium">
              {number.expires_at
                ? new Date(number.expires_at).toLocaleDateString()
                : "—"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
