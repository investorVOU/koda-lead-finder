import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Copy, Check, Mail } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { generateEmailSequence, type EmailSequence } from "@/lib/ai.functions";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Copied!");
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <Button variant="ghost" size="icon" className="size-7 shrink-0" onClick={copy}>
      {copied ? <Check className="size-3.5 text-green-500" /> : <Copy className="size-3.5" />}
    </Button>
  );
}

const TAB_LABELS = ["Email 1 · Day 1", "Email 2 · Day 3", "Email 3 · Day 7"];

export function EmailSequenceDialog({
  open,
  onOpenChange,
  lead,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  lead: {
    business_name: string;
    category: string | null;
    location: string | null;
    address: string | null;
    rating: number | null;
    review_count: number;
  };
}) {
  const runGenerate = useServerFn(generateEmailSequence);
  const [loading, setLoading] = useState(false);
  const [emails, setEmails] = useState<EmailSequence | null>(null);
  const [tab, setTab] = useState(0);

  const generate = async () => {
    setLoading(true);
    setEmails(null);
    const res = await runGenerate({
      data: {
        lead: {
          name: lead.business_name,
          category: lead.category ?? "",
          location: lead.location ?? "",
          address: lead.address ?? "",
          rating: lead.rating,
          reviewCount: lead.review_count,
        },
      },
    });
    setLoading(false);
    if ("error" in res) {
      toast.error(res.message);
      return;
    }
    setEmails(res.emails);
    setTab(0);
  };

  const handleOpen = (v: boolean) => {
    if (v && !emails && !loading) generate();
    if (!v) setEmails(null);
    onOpenChange(v);
  };

  const currentEmail = emails
    ? ([emails.email1, emails.email2, emails.email3][tab])
    : null;

  const copyAll = () => {
    if (!emails) return;
    const all = [emails.email1, emails.email2, emails.email3]
      .map((e, i) => `--- Email ${i + 1} (Day ${[1, 3, 7][i]}) ---\nSubject: ${e.subject}\n\n${e.body}`)
      .join("\n\n");
    navigator.clipboard.writeText(all);
    toast.success("All 3 emails copied!");
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="size-4 text-primary" /> Email Sequence
          </DialogTitle>
          <DialogDescription>
            3-email cold outreach drip for {lead.business_name} — copy & paste ready.
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="flex h-48 flex-col items-center justify-center gap-3 text-muted-foreground">
            <Loader2 className="size-6 animate-spin text-primary" />
            <p className="text-sm">Writing your emails…</p>
          </div>
        )}

        {!loading && emails && (
          <div className="flex flex-col gap-4">
            {/* Tabs */}
            <div className="flex gap-1 rounded-xl bg-muted p-1">
              {TAB_LABELS.map((label, i) => (
                <button
                  key={i}
                  onClick={() => setTab(i)}
                  className={`flex-1 rounded-lg py-1.5 text-xs font-medium transition-all ${
                    tab === i
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {currentEmail && (
              <div className="space-y-3">
                {/* Subject */}
                <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Subject</p>
                    <p className="text-sm font-medium">{currentEmail.subject}</p>
                  </div>
                  <CopyButton text={currentEmail.subject} />
                </div>

                {/* Body */}
                <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Body</p>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">{currentEmail.body}</p>
                  </div>
                  <CopyButton text={currentEmail.body} />
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="hero" className="flex-1" onClick={copyAll}>
                <Copy className="size-4" /> Copy All 3 Emails
              </Button>
              <Button variant="outline" onClick={generate} disabled={loading}>
                Regenerate
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
