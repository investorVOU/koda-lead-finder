import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Copy, Check, MessageCircle, Mail } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import type { SavedLead } from "@/components/dashboard/SavedLeadCard";
import {
  OUTREACH_TEMPLATES,
  whatsappLink,
  mailtoLink,
  type OutreachTemplate,
} from "@/lib/outreach";

function TemplateCard({ template, lead }: { template: OutreachTemplate; lead: SavedLead }) {
  const [copied, setCopied] = useState(false);
  const message = useMemo(() => template.build(lead), [template, lead]);

  const copy = async () => {
    await navigator.clipboard.writeText(message);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-sm font-semibold">{template.label}</h4>
        <Button variant="ghost" size="icon" className="size-7" onClick={copy} aria-label="Copy message">
          {copied ? <Check className="size-4 text-primary" /> : <Copy className="size-4" />}
        </Button>
      </div>
      <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">{message}</p>
      <div className="mt-3">
        {template.channel === "whatsapp" ? (
          <Button variant="hero" size="sm" className="w-full" asChild>
            <a href={whatsappLink(lead, message)} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="size-4" /> Open in WhatsApp
            </a>
          </Button>
        ) : (
          <Button variant="hero" size="sm" className="w-full" asChild>
            <a href={mailtoLink(lead, template, message)}>
              <Mail className="size-4" /> Open in email
            </a>
          </Button>
        )}
      </div>
    </div>
  );
}

export function OutreachDialog({
  open,
  onOpenChange,
  lead,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  lead: SavedLead;
}) {
  const whatsapp = OUTREACH_TEMPLATES.filter((t) => t.channel === "whatsapp");
  const email = OUTREACH_TEMPLATES.filter((t) => t.channel === "email");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Outreach templates</DialogTitle>
          <DialogDescription>
            Ready-to-send messages tailored to {lead.business_name}. Edit the name sign-off before sending.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="whatsapp" className="mt-2">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="whatsapp">
              <MessageCircle className="mr-1.5 size-4" /> WhatsApp
            </TabsTrigger>
            <TabsTrigger value="email">
              <Mail className="mr-1.5 size-4" /> Email
            </TabsTrigger>
          </TabsList>

          <TabsContent value="whatsapp" className="mt-4 space-y-3">
            {whatsapp.map((t) => (
              <TemplateCard key={t.id} template={t} lead={lead} />
            ))}
          </TabsContent>

          <TabsContent value="email" className="mt-4 space-y-3">
            {email.map((t) => (
              <TemplateCard key={t.id} template={t} lead={lead} />
            ))}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
