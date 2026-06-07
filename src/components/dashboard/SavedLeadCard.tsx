import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Star, Trash2, ExternalLink, Sparkles, PhoneCall, MessageCircle, FileText } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GenerateDialog } from "@/components/dashboard/GenerateDialog";
import { OutreachDialog } from "@/components/dashboard/OutreachDialog";
import { ProposalDialog } from "@/components/dashboard/ProposalDialog";
import { generateContent } from "@/lib/ai.functions";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { LEAD_STATUSES, STATUS_LABELS, type LeadStatusValue } from "@/lib/constants";

export interface SavedLead {
  id: string;
  business_name: string;
  address: string | null;
  phone: string | null;
  rating: number | null;
  review_count: number;
  has_website: boolean;
  maps_url: string | null;
  category: string | null;
  location: string | null;
  status: LeadStatusValue;
  deal_value: number;
}

export function SavedLeadCard({ lead }: { lead: SavedLead }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const runGenerate = useServerFn(generateContent);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogTitle, setDialogTitle] = useState("");
  const [dialogDesc, setDialogDesc] = useState("");
  const [content, setContent] = useState("");
  const [genLoading, setGenLoading] = useState(false);
  const [outreachOpen, setOutreachOpen] = useState(false);
  const [proposalOpen, setProposalOpen] = useState(false);
  const [dealInput, setDealInput] = useState(String(lead.deal_value || ""));

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["saved-leads", user?.id] });

  const changeStatus = async (status: LeadStatusValue) => {
    const { error } = await supabase.from("saved_leads").update({ status }).eq("id", lead.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    invalidate();
  };

  const saveDealValue = async () => {
    const value = Number(dealInput) || 0;
    if (value === lead.deal_value) return;
    const { error } = await supabase.from("saved_leads").update({ deal_value: value }).eq("id", lead.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    invalidate();
    toast.success("Deal value saved");
  };

  const remove = async () => {
    const { error } = await supabase.from("saved_leads").delete().eq("id", lead.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    invalidate();
    toast.success("Lead removed");
  };

  const generate = async (kind: "website_prompt" | "call_script") => {
    setDialogTitle(kind === "website_prompt" ? "AI Website Prompt" : "Cold Call Script");
    setDialogDesc(
      kind === "website_prompt"
        ? `A ready-to-paste prompt to build a site for ${lead.business_name}.`
        : `A personalized call script to pitch ${lead.business_name}.`,
    );
    setContent("");
    setGenLoading(true);
    setDialogOpen(true);
    const res = await runGenerate({
      data: {
        kind,
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
    setGenLoading(false);
    if ("error" in res) {
      toast.error(res.message);
      setDialogOpen(false);
      return;
    }
    setContent(res.content);
  };

  const showDealValue = lead.status === "closed" || lead.status === "paid";

  return (
    <>
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-semibold leading-tight">{lead.business_name}</h3>
          {!lead.has_website && (
            <span className="shrink-0 rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-semibold text-destructive">
              No site
            </span>
          )}
        </div>
        {lead.rating != null && (
          <p className="mt-1.5 inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Star className="size-3 fill-warning text-warning" />
            {lead.rating.toFixed(1)} ({lead.review_count})
          </p>
        )}
        {lead.phone && <p className="mt-1 text-xs text-muted-foreground">{lead.phone}</p>}

        <Select value={lead.status} onValueChange={(v) => changeStatus(v as LeadStatusValue)}>
          <SelectTrigger className="mt-3 h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LEAD_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {showDealValue && (
          <div className="mt-2 flex items-center gap-1">
            <span className="text-xs text-muted-foreground">$</span>
            <Input
              type="number"
              min={0}
              value={dealInput}
              onChange={(e) => setDealInput(e.target.value)}
              onBlur={saveDealValue}
              placeholder="Deal value"
              className="h-8 text-xs"
              aria-label={`Deal value for ${lead.business_name}`}
            />
          </div>
        )}

        <div className="mt-3 flex items-center gap-1">
          <Button variant="ghost" size="icon" className="size-8" onClick={() => generate("website_prompt")} aria-label="AI prompt">
            <Sparkles className="size-4" />
          </Button>
          <Button variant="ghost" size="icon" className="size-8" onClick={() => generate("call_script")} aria-label="Call script">
            <PhoneCall className="size-4" />
          </Button>
          <Button variant="ghost" size="icon" className="size-8" onClick={() => setOutreachOpen(true)} aria-label="Outreach templates">
            <MessageCircle className="size-4" />
          </Button>
          {lead.maps_url && (
            <Button variant="ghost" size="icon" className="size-8" asChild>
              <a href={lead.maps_url} target="_blank" rel="noopener noreferrer" aria-label="Open in Maps">
                <ExternalLink className="size-4" />
              </a>
            </Button>
          )}
          <Button variant="ghost" size="icon" className="ml-auto size-8 text-destructive" onClick={remove} aria-label="Delete">
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>

      <GenerateDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={dialogTitle}
        description={dialogDesc}
        content={content}
        loading={genLoading}
      />

      <OutreachDialog open={outreachOpen} onOpenChange={setOutreachOpen} lead={lead} />
    </>
  );
}
