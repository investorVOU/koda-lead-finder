import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";
import {
  Star,
  Trash2,
  ExternalLink,
  Code2,
  PhoneCall,
  MessageCircle,
  FileText,
  MessageSquareText,
  Check,
  Mail,
  CalendarClock,
  Bell,
  Wrench,
  Lock,
} from "lucide-react";
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
import { ReviewDialog } from "@/components/dashboard/ReviewDialog";
import { EmailSequenceDialog } from "@/components/dashboard/EmailSequenceDialog";
import { UpgradeDialog } from "@/components/dashboard/UpgradeDialog";
import { generateContent } from "@/lib/ai.functions";
import { analyzeReviews } from "@/lib/reviews.functions";
import type { ReviewAnalysis } from "@/lib/reviews.functions";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useSubscription } from "@/lib/queries";
import { hasPlanAccess } from "@/lib/billing";
import { LEAD_STATUSES, STATUS_LABELS, type LeadStatusValue } from "@/lib/constants";

export interface SavedLead {
  id: string;
  place_id: string | null;
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
  follow_up_at?: string | null;
}

// ── WhatsApp link builder ────────────────────────────────────────────────────
function buildWhatsAppUrl(phone: string, businessName: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 7) return null;
  const msg = encodeURIComponent(
    `Hi ${businessName}, I came across your business and noticed you might not have a website yet. I help local businesses get online quickly — would love to show you what I can build for you. Do you have 2 minutes to chat?`,
  );
  return `https://wa.me/${digits}?text=${msg}`;
}

// ── Due-today badge helper ───────────────────────────────────────────────────
function dueBadgeLabel(follow_up_at: string | null): string | null {
  if (!follow_up_at) return null;
  const due = new Date(follow_up_at);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  const diff = (due.getTime() - today.getTime()) / 86_400_000;
  if (diff < 0) return "Overdue";
  if (diff === 0) return "Due today";
  if (diff <= 2) return `Due in ${diff}d`;
  return null;
}

export function SavedLeadCard({ lead }: { lead: SavedLead }) {
  const { user } = useAuth();
  const { data: subscription } = useSubscription(user?.id);
  const queryClient = useQueryClient();
  const runGenerate = useServerFn(generateContent);
  const runAnalyzeReviews = useServerFn(analyzeReviews);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogTitle, setDialogTitle] = useState("");
  const [dialogDesc, setDialogDesc] = useState("");
  const [content, setContent] = useState("");
  const [genLoading, setGenLoading] = useState(false);
  const [genKind, setGenKind] = useState<"website_prompt" | "call_script">("website_prompt");

  const [outreachOpen, setOutreachOpen] = useState(false);
  const [proposalOpen, setProposalOpen] = useState(false);
  const [emailSeqOpen, setEmailSeqOpen] = useState(false);
  const [upgradeFeature, setUpgradeFeature] = useState<string | null>(null);

  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewAnalysis, setReviewAnalysis] = useState<ReviewAnalysis | null>(null);

  const [dealInput, setDealInput] = useState(String(lead.deal_value || ""));

  // Follow-up
  const [showFollowUp, setShowFollowUp] = useState(false);
  const [followUpDate, setFollowUpDate] = useState((lead.follow_up_at ?? "").slice(0, 10));

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["saved-leads", user?.id] });

  const changeStatus = async (status: LeadStatusValue) => {
    const { error } = await supabase.from("saved_leads").update({ status }).eq("id", lead.id);
    if (error) { toast.error(error.message); return; }
    invalidate();
  };

  const saveDealValue = async () => {
    const value = Number(dealInput) || 0;
    if (value === lead.deal_value) return;
    const { error } = await supabase.from("saved_leads").update({ deal_value: value }).eq("id", lead.id);
    if (error) { toast.error(error.message); return; }
    invalidate();
    toast.success("Deal value saved");
  };

  const saveFollowUp = async (date: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from("saved_leads")
      .update({ follow_up_at: date || null })
      .eq("id", lead.id);
    if (error) { toast.error(error.message); return; }
    invalidate();
    toast.success(date ? `Follow-up set for ${date}` : "Follow-up cleared");
  };

  const remove = async () => {
    const { error } = await supabase.from("saved_leads").delete().eq("id", lead.id);
    if (error) { toast.error(error.message); return; }
    invalidate();
    toast.success("Lead removed");
  };

  const generate = async (kind: "website_prompt" | "call_script") => {
    setGenKind(kind);
    setDialogTitle(kind === "website_prompt" ? "Website Prompt" : "Cold Call Script");
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

  const openReviews = async () => {
    if (!lead.place_id) return;
    setReviewAnalysis(null);
    setReviewLoading(true);
    setReviewOpen(true);
    const res = await runAnalyzeReviews({
      data: {
        placeId: lead.place_id,
        businessName: lead.business_name,
        category: lead.category ?? "",
        location: lead.location ?? "",
      },
    });
    setReviewLoading(false);
    if ("error" in res) {
      toast.error(res.message);
      setReviewOpen(false);
      return;
    }
    setReviewAnalysis(res.analysis);
  };

  const showDealValue = lead.status === "closed" || lead.status === "paid";
  const waUrl = lead.phone ? buildWhatsAppUrl(lead.phone, lead.business_name) : null;
  const dueBadge = dueBadgeLabel(lead.follow_up_at ?? null);
  const activeSubscription = subscription?.status === "active" || subscription?.status === "canceling";
  const canUseProTools = activeSubscription && hasPlanAccess(subscription?.plan, "pro");

  return (
    <>
      <div className="rounded-xl border border-border bg-card p-4">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-semibold leading-tight">{lead.business_name}</h3>
          <div className="flex shrink-0 items-center gap-1">
            {dueBadge && (
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${dueBadge === "Overdue" ? "bg-destructive/15 text-destructive" : "bg-amber-500/15 text-amber-600 dark:text-amber-400"}`}>
                {dueBadge}
              </span>
            )}
            {!lead.has_website && (
              <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-semibold text-destructive">
                No site
              </span>
            )}
          </div>
        </div>

        {lead.rating != null && (
          <p className="mt-1.5 inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Star className="size-3 fill-warning text-warning" />
            {lead.rating.toFixed(1)} ({lead.review_count})
          </p>
        )}
        {lead.phone && <p className="mt-1 text-xs text-muted-foreground">{lead.phone}</p>}

        {/* Follow-up line */}
        {lead.follow_up_at && !showFollowUp && (
          <button
            onClick={() => setShowFollowUp(true)}
            className="mt-1 flex items-center gap-1 text-[11px] text-primary hover:underline"
          >
            <Bell className="size-3" />
            {new Date(lead.follow_up_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </button>
        )}

        {/* Follow-up date input */}
        {showFollowUp && (
          <div className="mt-2 flex items-center gap-1">
            <CalendarClock className="size-3.5 shrink-0 text-muted-foreground" />
            <Input
              type="date"
              value={followUpDate}
              onChange={(e) => setFollowUpDate(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { saveFollowUp(followUpDate); setShowFollowUp(false); } }}
              className="h-7 flex-1 text-xs"
              min={new Date().toISOString().slice(0, 10)}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7 shrink-0 text-primary"
              onClick={() => { saveFollowUp(followUpDate); setShowFollowUp(false); }}
            >
              <Check className="size-3.5" />
            </Button>
          </div>
        )}

        <Select value={lead.status} onValueChange={(v) => changeStatus(v as LeadStatusValue)}>
          <SelectTrigger className="mt-3 h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LEAD_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
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
              onKeyDown={(e) => e.key === "Enter" && saveDealValue()}
              placeholder="Deal value"
              className="h-8 text-xs"
              aria-label={`Deal value for ${lead.business_name}`}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8 shrink-0 text-primary"
              onClick={saveDealValue}
              aria-label="Save deal value"
            >
              <Check className="size-4" />
            </Button>
          </div>
        )}

        {/* Action buttons */}
        <div className="mt-3 flex flex-wrap items-center gap-1">
          <Button variant="ghost" size="icon" className="size-8" onClick={() => generate("website_prompt")} title="Website prompt">
            <Code2 className="size-4" />
          </Button>
          <Button variant="ghost" size="icon" className="size-8" onClick={() => generate("call_script")} title="Cold call script">
            <PhoneCall className="size-4" />
          </Button>
          <Button variant="ghost" size="icon" className="size-8" onClick={() => (canUseProTools ? setEmailSeqOpen(true) : setUpgradeFeature("3-email outreach sequences"))} title={canUseProTools ? "Email sequence" : "Email sequence — Pro"}>
            {canUseProTools ? <Mail className="size-4" /> : <Lock className="size-4" />}
          </Button>
          <Button variant="ghost" size="icon" className="size-8" onClick={() => setOutreachOpen(true)} title="Outreach templates">
            <MessageCircle className="size-4" />
          </Button>
          <Button variant="ghost" size="icon" className="size-8" onClick={() => (canUseProTools ? setProposalOpen(true) : setUpgradeFeature("Branded PDF proposals"))} title={canUseProTools ? "Proposal" : "Proposal — Pro"}>
            {canUseProTools ? <FileText className="size-4" /> : <Lock className="size-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={openReviews}
            disabled={!lead.place_id || lead.review_count === 0}
            title="Analyze reviews"
          >
            <MessageSquareText className="size-4" />
          </Button>
          {/* Follow-up bell */}
          <Button
            variant="ghost"
            size="icon"
            className={`size-8 ${lead.follow_up_at ? "text-amber-500" : ""}`}
            onClick={() => setShowFollowUp((v) => !v)}
            title="Set follow-up reminder"
          >
            <Bell className="size-4" />
          </Button>
          {/* WhatsApp */}
          {waUrl && (
            <Button variant="ghost" size="icon" className="size-8 text-[#25D366]" asChild title="WhatsApp">
              <a href={waUrl} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp">
                <svg viewBox="0 0 24 24" className="size-4 fill-current" xmlns="http://www.w3.org/2000/svg">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                </svg>
              </a>
            </Button>
          )}
          {lead.maps_url && (
            <Button variant="ghost" size="icon" className="size-8" asChild>
              <a href={lead.maps_url} target="_blank" rel="noopener noreferrer" aria-label="Open in Maps">
                <ExternalLink className="size-4" />
              </a>
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto size-8 text-destructive"
            onClick={remove}
            aria-label="Delete"
          >
            <Trash2 className="size-4" />
          </Button>
        </div>

        {/* Build site shortcut — shown for contacted / closed / paid leads */}
        {(lead.status === "contacted" || lead.status === "closed" || lead.status === "paid") && (
          <Link
            to="/studio/new"
            search={{ leadId: lead.id }}
            className="mt-2 flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
          >
            <Wrench className="size-3.5 shrink-0" />
            Build their site in Studio →
          </Link>
        )}
      </div>

      <GenerateDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={dialogTitle}
        description={dialogDesc}
        content={content}
        loading={genLoading}
        kind={genKind}
        businessName={lead.business_name}
      />

      <EmailSequenceDialog open={emailSeqOpen} onOpenChange={setEmailSeqOpen} lead={lead} />
      <OutreachDialog open={outreachOpen} onOpenChange={setOutreachOpen} lead={lead} />
      <ProposalDialog open={proposalOpen} onOpenChange={setProposalOpen} lead={lead} />

      <UpgradeDialog
        open={upgradeFeature !== null}
        onOpenChange={(open) => !open && setUpgradeFeature(null)}
        feature={upgradeFeature ?? undefined}
        requiredPlan="pro"
      />

      <ReviewDialog
        open={reviewOpen}
        onOpenChange={setReviewOpen}
        businessName={lead.business_name}
        analysis={reviewAnalysis}
        loading={reviewLoading}
      />
    </>
  );
}
