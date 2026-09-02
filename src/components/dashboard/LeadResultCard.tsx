import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Star,
  MapPin,
  Phone,
  Bookmark,
  BookmarkCheck,
  Code2,
  PhoneCall,
  ExternalLink,
  Loader2,
  MessageSquareText,
  Calculator,
  TrendingUp,
  X,
  Lock,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { GenerateDialog } from "@/components/dashboard/GenerateDialog";
import { ReviewDialog } from "@/components/dashboard/ReviewDialog";
import { generateContent } from "@/lib/ai.functions";
import { analyzeReviews } from "@/lib/reviews.functions";
import type { ReviewAnalysis } from "@/lib/reviews.functions";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useSubscription, isFreeTrial } from "@/lib/queries";
import { UpgradeDialog } from "@/components/dashboard/UpgradeDialog";
import type { LeadResult } from "@/lib/constants";
import { hasPlanAccess, type PaidPlanId } from "@/lib/billing";
import { scoreLeadOpportunity } from "@/lib/lead-scoring";
import {
  estimateWebsitePrice,
  formatNairaCompact,
  type WebsiteEstimate,
} from "@/lib/pricing";

export function LeadResultCard({
  lead,
  category,
  location,
  isNew = false,
}: {
  lead: LeadResult;
  category: string;
  location: string;
  isNew?: boolean;
}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const runGenerate = useServerFn(generateContent);
  const runAnalyzeReviews = useServerFn(analyzeReviews);

  const { data: subscription } = useSubscription(user?.id);
  const trialUser = isFreeTrial(subscription);
  const proUser = !trialUser && hasPlanAccess(subscription?.plan, "pro");

  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeFeature, setUpgradeFeature] = useState("");
  const [requiredPlan, setRequiredPlan] = useState<PaidPlanId | undefined>();

  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const [estimate, setEstimate] = useState<WebsiteEstimate | null>(null);
  const [estimating, setEstimating] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogTitle, setDialogTitle] = useState("");
  const [dialogDesc, setDialogDesc] = useState("");
  const [content, setContent] = useState("");
  const [genLoading, setGenLoading] = useState(false);
  const [genKind, setGenKind] = useState<
    "website_prompt" | "call_script"
  >("website_prompt");

  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewAnalysis, setReviewAnalysis] =
    useState<ReviewAnalysis | null>(null);

  const gate = (feature: string, plan?: PaidPlanId) => {
    setUpgradeFeature(feature);
    setRequiredPlan(plan);
    setUpgradeOpen(true);
  };

  const estimatePrice = () => {
    if (trialUser) {
      gate("Website Price Estimates");
      return;
    }

    if (estimating) return;

    setEstimating(true);

    // Deliberately deterministic and AI-free.
    // The tiny timeout gives the button a natural loading state
    // without making the UI feel like it instantly flashed open.
    window.setTimeout(() => {
      const result = estimateWebsitePrice(
        lead,
        category,
        location,
      );

      setEstimate(result);
      setEstimating(false);
    }, 250);
  };

  const clearEstimate = () => {
    setEstimate(null);
  };

  const leadScore = scoreLeadOpportunity(lead);

  const saveLead = async () => {
    if (trialUser) {
      gate("Saving leads");
      return;
    }

    if (!user || saved) return;

    setSaving(true);

    const duplicateQuery = lead.placeId
      ? supabase
          .from("saved_leads")
          .select("id,business_name")
          .eq("place_id", lead.placeId)
          .limit(1)
          .maybeSingle()
      : supabase
          .from("saved_leads")
          .select("id,business_name")
          .eq("business_name", lead.name)
          .eq("location", location)
          .limit(1)
          .maybeSingle();
    const { data: existingLead, error: duplicateError } = await duplicateQuery;

    if (duplicateError) {
      setSaving(false);
      toast.error("Could not check for an existing saved lead. Please try again.");
      return;
    }

    if (existingLead) {
      setSaving(false);
      setSaved(true);
      toast.warning(`${existingLead.business_name} is already in your pipeline.`);
      return;
    }

    const { error } = await supabase.from("saved_leads").insert({
      user_id: user.id,
      place_id: lead.placeId,
      business_name: lead.name,
      address: lead.address,
      phone: lead.phone,
      rating: lead.rating,
      review_count: lead.reviewCount,
      has_website: lead.hasWebsite,
      website_url: lead.websiteUrl,
      maps_url: lead.mapsUrl,
      category,
      location,
    });

    setSaving(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    setSaved(true);

    queryClient.invalidateQueries({
      queryKey: ["saved-leads", user.id],
    });

    toast.success("Lead saved to your pipeline");
  };

  const generate = async (
    kind: "website_prompt" | "call_script",
  ) => {
    if (trialUser) {
      gate(
        kind === "website_prompt"
          ? "Website Prompts"
          : "Cold Call Scripts",
      );
      return;
    }

    setGenKind(kind);

    setDialogTitle(
      kind === "website_prompt"
        ? "Website Prompt"
        : "Cold Call Script",
    );

    setDialogDesc(
      kind === "website_prompt"
        ? `A ready-to-paste prompt to build a site for ${lead.name}.`
        : `A personalized call script to pitch ${lead.name}.`,
    );

    setContent("");
    setGenLoading(true);
    setDialogOpen(true);

    const res = await runGenerate({
      data: {
        kind,
        lead: {
          name: lead.name,
          category,
          location,
          address: lead.address,
          rating: lead.rating,
          reviewCount: lead.reviewCount,
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
    if (trialUser) {
      gate("Review Analysis");
      return;
    }

    setReviewAnalysis(null);
    setReviewLoading(true);
    setReviewOpen(true);

    const res = await runAnalyzeReviews({
      data: {
        placeId: lead.placeId,
        businessName: lead.name,
        category,
        location,
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

  return (
    <>
      <div className="min-w-0 rounded-2xl border border-border bg-card p-5 transition-shadow hover:shadow-[var(--shadow-md)]">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold">
              {lead.name}
            </h3>

            <p className="mt-1 flex items-start gap-1.5 text-sm text-muted-foreground">
              <MapPin className="mt-0.5 size-3.5 shrink-0" />

              <span className="min-w-0 line-clamp-2">
                {lead.address}
              </span>
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            {isNew && (
              <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                New
              </span>
            )}
            {!lead.hasWebsite ? (
              <span className="rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-semibold text-destructive">
                No Website
              </span>
            ) : (
              <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                Has site
              </span>
            )}
          </div>
        </div>

        {/* Lead metadata */}
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          {lead.rating != null && (
            <span className="inline-flex items-center gap-1 font-medium">
              <Star className="size-4 fill-warning text-warning" />

              {lead.rating.toFixed(1)}

              <span className="text-muted-foreground">
                ({lead.reviewCount})
              </span>
            </span>
          )}

          {lead.phone && (
            <a
              href={`tel:${lead.phone}`}
              className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
            >
              <Phone className="size-3.5" />
              {lead.phone}
            </a>
          )}
        </div>

        {proUser ? (
          <div className="mt-4 rounded-xl border border-primary/20 bg-primary/[0.04] px-3.5 py-3">
            <div className="flex items-center justify-between gap-3">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary">
                <TrendingUp className="size-3.5" /> Opportunity score
              </span>
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
                {leadScore.opportunity} · {leadScore.score}/100
              </span>
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
              {leadScore.reasons[0] ?? "Review this lead before reaching out."}
            </p>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => gate("Pro opportunity scores", "pro")}
            className="mt-4 flex w-full items-center justify-between rounded-xl border border-dashed border-border px-3.5 py-3 text-left text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/[0.03] hover:text-foreground"
          >
            <span className="inline-flex items-center gap-1.5"><Lock className="size-3.5" /> See which leads to contact first</span>
            <span className="text-primary">Pro</span>
          </button>
        )}

        {/* Price estimate */}
        {estimate ? (
          <div className="mt-4 overflow-hidden rounded-xl border border-primary/20 bg-primary/[0.04]">
            <div className="flex items-start justify-between gap-3 border-b border-primary/10 px-4 py-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Potential Deal
                </p>

                <p className="mt-1 text-2xl font-bold tracking-tight text-primary">
                  {formatNairaCompact(
                    estimate.potentialDealValue,
                  )}
                </p>

                <p className="mt-0.5 text-xs text-muted-foreground">
                  Suggested quote:{" "}
                  {formatNairaCompact(estimate.min)} –{" "}
                  {formatNairaCompact(estimate.max)}
                </p>
              </div>

              <button
                type="button"
                onClick={clearEstimate}
                aria-label="Hide estimate"
                className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-px bg-border/50">
              <div className="bg-card px-4 py-3">
                <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  Business Size
                </p>

                <p className="mt-1 text-sm font-semibold">
                  {estimate.businessSize}
                </p>
              </div>

              <div className="bg-card px-4 py-3">
                <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  Website
                </p>

                <p className="mt-1 text-sm font-semibold">
                  {estimate.complexity}
                </p>
              </div>

              <div className="bg-card px-4 py-3">
                <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  Lead Quality
                </p>

                <p className="mt-1 text-sm font-semibold">
                  {estimate.leadQuality}
                </p>
              </div>

              <div className="bg-card px-4 py-3">
                <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  Opportunity
                </p>

                <p className="mt-1 inline-flex items-center gap-1 text-sm font-semibold">
                  <TrendingUp className="size-3.5 text-primary" />
                  {estimate.score}/100
                </p>
              </div>
            </div>

            {estimate.reasons.length > 0 && (
              <div className="border-t border-primary/10 px-4 py-3">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Why Koda estimates this
                </p>

                <ul className="space-y-1">
                  {estimate.reasons.map((reason) => (
                    <li
                      key={reason}
                      className="flex items-start gap-2 text-xs text-muted-foreground"
                    >
                      <span className="mt-1.5 size-1 shrink-0 rounded-full bg-primary" />
                      {reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="mt-4 w-full border-primary/30 text-primary hover:bg-primary/5"
            onClick={estimatePrice}
            disabled={estimating}
          >
            {estimating ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Estimating...
              </>
            ) : (
              <>
                <Calculator className="size-4" />
                Estimate Website Price
              </>
            )}
          </Button>
        )}

        {/* Actions */}
        <div className="mt-4 space-y-2">
          <Button
            variant="hero"
            size="sm"
            className="w-full"
            onClick={() => generate("website_prompt")}
          >
            <Code2 className="size-4" />
            Build Website Prompt
          </Button>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Button
              variant={saved ? "soft" : "outline"}
              size="sm"
              onClick={saveLead}
              disabled={saving || saved}
            >
              {saving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : saved ? (
                <BookmarkCheck className="size-4" />
              ) : (
                <Bookmark className="size-4" />
              )}

              {saved ? "Saved" : "Save"}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => generate("call_script")}
            >
              <PhoneCall className="size-4" />
              Script
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={openReviews}
              disabled={lead.reviewCount === 0}
              title={
                lead.reviewCount === 0
                  ? "No reviews"
                  : "Analyze reviews"
              }
            >
              <MessageSquareText className="size-4" />
              Reviews
            </Button>

            <Button
              variant="ghost"
              size="sm"
              asChild
            >
              <a
                href={lead.mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="size-4" />
                Maps
              </a>
            </Button>
          </div>
        </div>
      </div>

      <GenerateDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={dialogTitle}
        description={dialogDesc}
        content={content}
        loading={genLoading}
        kind={genKind}
        businessName={lead.name}
      />

      <ReviewDialog
        open={reviewOpen}
        onOpenChange={setReviewOpen}
        businessName={lead.name}
        analysis={reviewAnalysis}
        loading={reviewLoading}
      />

      <UpgradeDialog
        open={upgradeOpen}
        onOpenChange={setUpgradeOpen}
        feature={upgradeFeature}
        requiredPlan={requiredPlan}
      />
    </>
  );
}
