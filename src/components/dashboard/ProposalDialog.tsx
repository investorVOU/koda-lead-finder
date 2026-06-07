import { useState } from "react";
import { FileText, Download } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { SavedLead } from "@/components/dashboard/SavedLeadCard";
import { generateProposalPdf, type ProposalOptions } from "@/lib/proposal";

const STORAGE_KEY = "kodarai-proposal-sender";

function loadSender(): Partial<ProposalOptions> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

export function ProposalDialog({
  open,
  onOpenChange,
  lead,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  lead: SavedLead;
}) {
  const saved = loadSender();
  const [opts, setOpts] = useState<ProposalOptions>({
    fromName: saved.fromName ?? "",
    fromCompany: saved.fromCompany ?? "",
    fromContact: saved.fromContact ?? "",
    packageName: saved.packageName ?? "Professional Website",
    price: saved.price ?? "",
    timeline: saved.timeline ?? "1–2 weeks from kickoff to launch",
    scope:
      saved.scope ??
      "Custom website design, mobile optimisation, contact & booking integration, Google Maps embed, and basic SEO setup.",
  });

  const set = (key: keyof ProposalOptions, value: string) =>
    setOpts((prev) => ({ ...prev, [key]: value }));

  const download = () => {
    // Persist sender + package defaults for next time.
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        fromName: opts.fromName,
        fromCompany: opts.fromCompany,
        fromContact: opts.fromContact,
        packageName: opts.packageName,
        price: opts.price,
        timeline: opts.timeline,
        scope: opts.scope,
      }),
    );
    generateProposalPdf(lead, opts);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="size-5 text-primary" /> Proposal for {lead.business_name}
          </DialogTitle>
          <DialogDescription>
            Generate a branded one-page PDF proposal. Your details are saved for next time.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="p-company">Your business name</Label>
              <Input id="p-company" value={opts.fromCompany} onChange={(e) => set("fromCompany", e.target.value)} placeholder="Acme Web Studio" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-name">Your name</Label>
              <Input id="p-name" value={opts.fromName} onChange={(e) => set("fromName", e.target.value)} placeholder="Jane Doe" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p-contact">Contact (email / phone)</Label>
            <Input id="p-contact" value={opts.fromContact} onChange={(e) => set("fromContact", e.target.value)} placeholder="jane@acme.com · +234..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="p-package">Package name</Label>
              <Input id="p-package" value={opts.packageName} onChange={(e) => set("packageName", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-price">Price</Label>
              <Input id="p-price" value={opts.price} onChange={(e) => set("price", e.target.value)} placeholder="$500 / ₦450,000" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p-timeline">Timeline</Label>
            <Input id="p-timeline" value={opts.timeline} onChange={(e) => set("timeline", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p-scope">Scope of work</Label>
            <Textarea id="p-scope" rows={3} value={opts.scope} onChange={(e) => set("scope", e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="hero" onClick={download} className="w-full sm:w-auto">
            <Download className="size-4" /> Download PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
