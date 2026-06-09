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

export function LeadResultCard({
  lead,
  category,
  location,
}: {
  lead: LeadResult;
  category: string;
  location: string;
}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const runGenerate = useServerFn(generateContent);
  const runAnalyzeReviews = useServerFn(analyzeReviews);

  const { data: subscription } = useSubscription(user?.id);
  const trialUser = isFreeTrial(subscription);

  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeFeature, setUpgradeFeature] = useState("");

  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogTitle, setDialogTitle] = useState("");
  const [dialogDesc, setDialogDesc] = useState("");
  const [content, setContent] = useState("");
  const [genLoading, setGenLoading] = useState(false);
  const [genKind, setGenKind] = useState<"website_prompt" | "call_script">("website_prompt");

  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewAnalysis, setReviewAnalysis] = useState<ReviewAnalysis | null>(null);

  const gate = (feature: string) => {
    setUpgradeFeature(feature);
    setUpgradeOpen(true);
  };

  const saveLead = async () => {
    if (trialUser) { gate("Saving leads"); return; }
    if (!user || saved) return;
    setSaving(true);
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
    queryClient.invalidateQueries({ queryKey: ["saved-leads", user.id] });
    toast.success("Lead saved to your pipeline");
  };

  const generate = async (kind: "website_prompt" | "call_script") => {
    if (trialUser) {
      gate(kind === "website_prompt" ? "Website Prompts" : "Cold Call Scripts");
      return;
    }
    setGenKind(kind);
    setDialogTitle(kind === "website_prompt" ? "Website Prompt" : "Cold Call Script");
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
      <div className="rounded-2xl border border-border bg-card p-5 transition-shadow hover:shadow-[var(--shadow-md)]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold">{lead.name}</h3>
            <p className="mt-1 flex items-start gap-1.5 text-sm text-muted-foreground">
              <MapPin className="mt-0.5 size-3.5 shrink-0" />
              <span className="line-clamp-2">{lead.address}</span>
            </p>
          </div>
          {!lead.hasWebsite ? (
            <span className="shrink-0 rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-semibold text-destructive">
              No Website
            </span>
          ) : (
            <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
              Has site
            </span>
          )}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          {lead.rating != null && (
            <span className="inline-flex items-center gap-1 font-medium">
              <Star className="size-4 fill-warning text-warning" />
              {lead.rating.toFixed(1)}
              <span className="text-muted-foreground">({lead.reviewCount})</span>
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

        <div className="mt-4 space-y-2">
          <Button
            variant="hero"
            size="sm"
            className="w-full"
            onClick={() => generate("website_prompt")}
          >
            <Code2 className="size-4" /> Build Website Prompt
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
            <Button variant="outline" size="sm" onClick={() => generate("call_script")}>
              <PhoneCall className="size-4" /> Script
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={openReviews}
              disabled={lead.reviewCount === 0}
              title={lead.reviewCount === 0 ? "No reviews" : "Analyze reviews"}
            >
              <MessageSquareText className="size-4" /> Reviews
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <a href={lead.mapsUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="size-4" /> Maps
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
      />
    </>
  );
}
