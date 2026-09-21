import { useMemo, useState } from "react";
import { Copy, MessageCircle, Mail, Check } from "lucide-react";
import { toast } from "sonner";
import type { SavedLead } from "@/components/dashboard/SavedLeadCard";
import { whatsappLink } from "@/lib/outreach";
import { trackEvent } from "@/lib/analytics";
import { Button } from "@/components/ui/button";

type Tone = "casual" | "professional" | "short";
function messageFor(lead: Pick<SavedLead, "business_name" | "location" | "address" | "has_website"> | undefined, tone: Tone) {
  const name = lead?.business_name || "your business";
  const websiteLine = lead?.has_website
    ? "I had an idea for how your website could bring in more enquiries."
    : "I noticed you don't have a website yet, so I made a quick sample to show what your business could look like online.";
  if (tone === "short") return `Hi ${name}, I came across your business while researching businesses online. ${websiteLine} Can I send it to you?`;
  if (tone === "professional") return `Hello ${name},\n\nI came across your business while researching businesses online. ${websiteLine}\n\nWould you be open to seeing it?`;
  return `Hi ${name}, I came across your business while researching businesses online. ${websiteLine}\n\nCan I send it to you?`;
}

export function MessageHelper({ lead, compact = false }: { lead?: SavedLead; compact?: boolean }) {
  const [tone, setTone] = useState<Tone>("casual");
  const [copied, setCopied] = useState(false);
  const message = useMemo(() => messageFor(lead, tone), [lead, tone]);
  const copy = async () => {
    await navigator.clipboard.writeText(message);
    setCopied(true); trackEvent("message_copied"); toast.success("Message copied");
    window.setTimeout(() => setCopied(false), 1800);
  };
  const phoneExists = Boolean(lead?.phone && lead.phone.replace(/\D/g, "").length >= 7);
  return (
    <section className={`rounded-2xl border border-border bg-card ${compact ? "p-4" : "p-5"}`}>
      <div className="flex items-start justify-between gap-3"><div><h2 className="font-semibold">Message helper</h2><p className="mt-1 text-sm text-muted-foreground">Get a message to send to business owners.</p></div><MessageCircle className="size-5 text-primary" /></div>
      <div className="mt-4 rounded-xl border border-border bg-muted/30 p-3 whitespace-pre-wrap text-sm leading-6">{message}</div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={copy}>{copied ? <Check className="size-4 text-primary" /> : <Copy className="size-4" />}{copied ? "Copied" : "Copy message"}</Button>
        {phoneExists && <Button size="sm" asChild onClick={() => trackEvent("whatsapp_outreach_clicked")}><a href={whatsappLink(lead!, message)} target="_blank" rel="noreferrer"><MessageCircle className="size-4" />Send on WhatsApp</a></Button>}
        {!compact && <span className="inline-flex items-center gap-1 px-2 text-xs text-muted-foreground"><Mail className="size-3" />Copy to use in email</span>}
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-xs"><button className="text-primary hover:underline" onClick={() => setTone("casual")}>Make it more casual</button><button className="text-primary hover:underline" onClick={() => setTone("short")}>Make it shorter</button><button className="text-primary hover:underline" onClick={() => setTone("professional")}>Make it more professional</button></div>
    </section>
  );
}
