import {
  useState,
  type ReactNode,
} from "react";

import {
  createPortal,
} from "react-dom";

import {
  useServerFn,
} from "@tanstack/react-start";

import {
  useQueryClient,
} from "@tanstack/react-query";

import {
  useNavigate,
} from "@tanstack/react-router";

import {
  toast,
} from "sonner";

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
  Wrench,
  ArrowRight,
  Copy,
  Check,
} from "lucide-react";

import {
  Button,
} from "@/components/ui/button";

import {
  GenerateDialog,
} from "@/components/dashboard/GenerateDialog";

import {
  ReviewDialog,
} from "@/components/dashboard/ReviewDialog";

import {
  UpgradeDialog,
} from "@/components/dashboard/UpgradeDialog";

import {
  generateContent,
} from "@/lib/ai.functions";

import {
  analyzeReviews,
} from "@/lib/reviews.functions";

import type {
  ReviewAnalysis,
} from "@/lib/reviews.functions";

import {
  supabase,
} from "@/integrations/supabase/client";

import {
  useAuth,
} from "@/lib/auth";

import {
  useSubscription,
  isFreeTrial,
} from "@/lib/queries";

import type {
  LeadResult,
} from "@/lib/constants";

import {
  hasPlanAccess,
  type PaidPlanId,
} from "@/lib/billing";

import {
  scoreLeadOpportunity,
} from "@/lib/lead-scoring";

import {
  createWebsiteProjectFromLead,
} from "@/lib/studio.functions";

import {
  estimateWebsitePrice,
  formatNairaCompact,
  type WebsiteEstimate,
} from "@/lib/pricing";

type BuilderOption = {
  id: string;

  name: string;

  url: string;
};

const EXTERNAL_BUILDERS: BuilderOption[] =
  [
    {
      id: "lovable",
      name: "Lovable",
      url: "https://lovable.dev/",
    },

    {
      id: "bolt",
      name: "Bolt",
      url: "https://bolt.new/",
    },

    {
      id: "replit",
      name: "Replit",
      url: "https://replit.com/",
    },

    {
      id: "v0",
      name: "v0",
      url: "https://v0.dev/",
    },
  ];

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
  const {
    user,
  } =
    useAuth();

  const navigate =
    useNavigate();

  const queryClient =
    useQueryClient();

  const runGenerate =
    useServerFn(
      generateContent,
    );

  const runAnalyzeReviews =
    useServerFn(
      analyzeReviews,
    );

  const runCreateWebsiteProject =
    useServerFn(
      createWebsiteProjectFromLead,
    );

  const {
    data:
      subscription,
  } =
    useSubscription(
      user?.id,
    );

  const trialUser =
    isFreeTrial(
      subscription,
    );

  const proUser =
    !trialUser &&
    hasPlanAccess(
      subscription?.plan,
      "pro",
    );

  const [
    upgradeOpen,
    setUpgradeOpen,
  ] =
    useState(
      false,
    );

  const [
    upgradeFeature,
    setUpgradeFeature,
  ] =
    useState("");

  const [
    requiredPlan,
    setRequiredPlan,
  ] =
    useState<
      PaidPlanId | undefined
    >();

  const [
    saved,
    setSaved,
  ] =
    useState(
      false,
    );

  const [
    saving,
    setSaving,
  ] =
    useState(
      false,
    );

  const [
    buildingWebsite,
    setBuildingWebsite,
  ] =
    useState(
      false,
    );

  const [
    buildChoiceOpen,
    setBuildChoiceOpen,
  ] =
    useState(
      false,
    );

  const [
    buildScriptOpen,
    setBuildScriptOpen,
  ] =
    useState(
      false,
    );

  const [
    buildScript,
    setBuildScript,
  ] =
    useState("");

  const [
    buildScriptLoading,
    setBuildScriptLoading,
  ] =
    useState(
      false,
    );

  const [
    scriptCopied,
    setScriptCopied,
  ] =
    useState(
      false,
    );

  const [
    openingBuilder,
    setOpeningBuilder,
  ] =
    useState<
      string | null
    >(null);

  const [
    estimate,
    setEstimate,
  ] =
    useState<
      WebsiteEstimate | null
    >(null);

  const [
    estimating,
    setEstimating,
  ] =
    useState(
      false,
    );

  const [
    dialogOpen,
    setDialogOpen,
  ] =
    useState(
      false,
    );

  const [
    dialogTitle,
    setDialogTitle,
  ] =
    useState("");

  const [
    dialogDesc,
    setDialogDesc,
  ] =
    useState("");

  const [
    content,
    setContent,
  ] =
    useState("");

  const [
    genLoading,
    setGenLoading,
  ] =
    useState(
      false,
    );

  const [
    genKind,
    setGenKind,
  ] =
    useState<
      | "website_prompt"
      | "call_script"
    >(
      "website_prompt",
    );

  const [
    reviewOpen,
    setReviewOpen,
  ] =
    useState(
      false,
    );

  const [
    reviewLoading,
    setReviewLoading,
  ] =
    useState(
      false,
    );

  const [
    reviewAnalysis,
    setReviewAnalysis,
  ] =
    useState<
      ReviewAnalysis | null
    >(null);

  const gate = (
    feature: string,

    plan?: PaidPlanId,
  ) => {
    setUpgradeFeature(
      feature,
    );

    setRequiredPlan(
      plan,
    );

    setUpgradeOpen(
      true,
    );
  };

  const openBuildChoice =
    () => {
      if (
        trialUser
      ) {
        gate(
          "Kodarai Builder",
        );

        return;
      }

      setBuildChoiceOpen(
        true,
      );
    };

  const estimatePrice =
    () => {
      if (
        trialUser
      ) {
        gate(
          "Website Price Estimates",
        );

        return;
      }

      if (
        estimating
      ) {
        return;
      }

      setEstimating(
        true,
      );

      window.setTimeout(
        () => {
          const result =
            estimateWebsitePrice(
              lead,
              category,
              location,
            );

          setEstimate(
            result,
          );

          setEstimating(
            false,
          );
        },

        250,
      );
    };

  const clearEstimate =
    () => {
      setEstimate(
        null,
      );
    };

  const leadScore =
    scoreLeadOpportunity(
      lead,
    );

  const saveLead =
    async () => {
      if (
        trialUser
      ) {
        gate(
          "Saving leads",
        );

        return;
      }

      if (
        !user ||
        saved
      ) {
        return;
      }

      setSaving(
        true,
      );

      const duplicateQuery =
        lead.placeId
          ? supabase
              .from(
                "saved_leads",
              )
              .select(
                "id,business_name",
              )
              .eq(
                "place_id",
                lead.placeId,
              )
              .limit(
                1,
              )
              .maybeSingle()
          : supabase
              .from(
                "saved_leads",
              )
              .select(
                "id,business_name",
              )
              .eq(
                "business_name",
                lead.name,
              )
              .eq(
                "location",
                location,
              )
              .limit(
                1,
              )
              .maybeSingle();

      const {
        data:
          existingLead,

        error:
          duplicateError,
      } =
        await duplicateQuery;

      if (
        duplicateError
      ) {
        setSaving(
          false,
        );

        toast.error(
          "Could not check for an existing saved lead. Please try again.",
        );

        return;
      }

      if (
        existingLead
      ) {
        setSaving(
          false,
        );

        setSaved(
          true,
        );

        toast.warning(
          `${existingLead.business_name} is already in your pipeline.`,
        );

        return;
      }

      const {
        error,
      } =
        await supabase
          .from(
            "saved_leads",
          )
          .insert({
            user_id:
              user.id,

            place_id:
              lead.placeId,

            business_name:
              lead.name,

            address:
              lead.address,

            phone:
              lead.phone,

            rating:
              lead.rating,

            review_count:
              lead.reviewCount,

            has_website:
              lead.hasWebsite,

            website_url:
              lead.websiteUrl,

            maps_url:
              lead.mapsUrl,

            category,

            location,
          });

      setSaving(
        false,
      );

      if (
        error
      ) {
        toast.error(
          error.message,
        );

        return;
      }

      setSaved(
        true,
      );

      queryClient.invalidateQueries(
        {
          queryKey: [
            "saved-leads",
            user.id,
          ],
        },
      );

      toast.success(
        "Lead saved to your pipeline",
      );
    };

  const generate =
    async (
      kind:
        | "website_prompt"
        | "call_script",
    ) => {
      if (
        trialUser
      ) {
        gate(
          kind ===
            "website_prompt"
            ? "Website Build Scripts"
            : "Cold Call Scripts",
        );

        return;
      }

      setGenKind(
        kind,
      );

      setDialogTitle(
        kind ===
          "website_prompt"
          ? "Website Build Script"
          : "Cold Call Script",
      );

      setDialogDesc(
        kind ===
          "website_prompt"
          ? `A ready-to-use build script for ${lead.name}.`
          : `A personalized call script to pitch ${lead.name}.`,
      );

      setContent("");

      setGenLoading(
        true,
      );

      setDialogOpen(
        true,
      );

      const res =
        await runGenerate({
          data: {
            kind,

            lead: {
              name:
                lead.name,

              category,

              location,

              address:
                lead.address,

              rating:
                lead.rating,

              reviewCount:
                lead.reviewCount,
            },
          },
        });

      setGenLoading(
        false,
      );

      if (
        "error" in
        res
      ) {
        toast.error(
          res.message,
        );

        setDialogOpen(
          false,
        );

        return;
      }

      setContent(
        res.content,
      );
    };

  const generateBuildScript =
    async () => {
      if (
        trialUser
      ) {
        setBuildChoiceOpen(
          false,
        );

        gate(
          "Website Build Scripts",
        );

        return;
      }

      setBuildChoiceOpen(
        false,
      );

      setBuildScript("");

      setScriptCopied(
        false,
      );

      setOpeningBuilder(
        null,
      );

      setBuildScriptOpen(
        true,
      );

      setBuildScriptLoading(
        true,
      );

      try {
        const res =
          await runGenerate({
            data: {
              kind:
                "website_prompt",

              lead: {
                name:
                  lead.name,

                category,

                location,

                address:
                  lead.address,

                rating:
                  lead.rating,

                reviewCount:
                  lead.reviewCount,
              },
            },
          });

        if (
          "error" in
          res
        ) {
          toast.error(
            res.message,
          );

          setBuildScriptOpen(
            false,
          );

          return;
        }

        setBuildScript(
          res.content,
        );
      } catch {
        toast.error(
          "Could not generate the build script.",
        );

        setBuildScriptOpen(
          false,
        );
      } finally {
        setBuildScriptLoading(
          false,
        );
      }
    };

  const copyBuildScript =
    async () => {
      if (
        !buildScript
      ) {
        return;
      }

      try {
        await navigator.clipboard.writeText(
          buildScript,
        );

        setScriptCopied(
          true,
        );

        toast.success(
          "Build script copied",
        );

        window.setTimeout(
          () => {
            setScriptCopied(
              false,
            );
          },

          1800,
        );
      } catch {
        toast.error(
          "Could not copy the build script",
        );
      }
    };

  const openExternalBuilder =
    async (
      builder:
        BuilderOption,
    ) => {
      if (
        !buildScript
      ) {
        return;
      }

      setOpeningBuilder(
        builder.id,
      );

      /*
       * Open immediately so mobile Safari does not
       * block it after awaiting clipboard permissions.
       */
      const tab =
        window.open(
          "",
          "_blank",
        );

      let copied =
        false;

      try {
        await navigator.clipboard.writeText(
          buildScript,
        );

        copied =
          true;

        setScriptCopied(
          true,
        );
      } catch {
        copied =
          false;
      }

      if (
        tab
      ) {
        tab.opener =
          null;

        tab.location.href =
          builder.url;
      } else {
        window.open(
          builder.url,
          "_blank",
          "noopener,noreferrer",
        );
      }

      setOpeningBuilder(
        null,
      );

      if (
        copied
      ) {
        toast.success(
          `Copied — paste the script into ${builder.name}`,
        );
      } else {
        toast.info(
          `${builder.name} opened. Copy the build script and paste it there.`,
        );
      }
    };

  const openReviews =
    async () => {
      if (
        trialUser
      ) {
        gate(
          "Review Analysis",
        );

        return;
      }

      setReviewAnalysis(
        null,
      );

      setReviewLoading(
        true,
      );

      setReviewOpen(
        true,
      );

      const res =
        await runAnalyzeReviews({
          data: {
            placeId:
              lead.placeId,

            businessName:
              lead.name,

            category,

            location,
          },
        });

      setReviewLoading(
        false,
      );

      if (
        "error" in
        res
      ) {
        toast.error(
          res.message,
        );

        setReviewOpen(
          false,
        );

        return;
      }

      setReviewAnalysis(
        res.analysis,
      );
    };

  const buildWebsite =
    async () => {
      if (
        trialUser
      ) {
        gate(
          "Kodarai Builder",
        );

        return;
      }

      if (
        lead.hasWebsite ||
        buildingWebsite
      ) {
        return;
      }

      setBuildChoiceOpen(
        false,
      );

      setBuildingWebsite(
        true,
      );

      try {
        const result =
          await runCreateWebsiteProject(
            {
              data: {
                placeId:
                  lead.placeId,

                name:
                  lead.name,

                category,

                location,

                address:
                  lead.address,

                phone:
                  lead.phone,

                rating:
                  lead.rating,

                reviewCount:
                  lead.reviewCount,

                hasWebsite:
                  lead.hasWebsite,

                websiteUrl:
                  lead.websiteUrl,

                mapsUrl:
                  lead.mapsUrl,
              },
            },
          );

        if (
          "error" in
          result
        ) {
          toast.error(
            result.message,
          );

          return;
        }

        toast.success(
          "Creating your website…",
        );

        navigate({
          to:
            "/studio/$projectId",

          params: {
            projectId:
              result.project.id,
          },

          search: {
            generate:
              "1",
          },
        });
      } catch {
        toast.error(
          "Could not create the website project. Please try again.",
        );
      } finally {
        setBuildingWebsite(
          false,
        );
      }
    };

  return (
    <>
      <div className="min-w-0 rounded-2xl border border-border bg-card p-5 transition-shadow hover:shadow-[var(--shadow-md)]">
        {/* BUSINESS */}

        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold">
              {
                lead.name
              }
            </h3>

            <p className="mt-1 flex items-start gap-1.5 text-sm text-muted-foreground">
              <MapPin className="mt-0.5 size-3.5 shrink-0" />

              <span className="min-w-0 line-clamp-2">
                {
                  lead.address
                }
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

        {/* DETAILS */}

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          {lead.rating !=
            null && (
            <span className="inline-flex items-center gap-1 font-medium">
              <Star className="size-4 fill-warning text-warning" />

              {lead.rating.toFixed(
                1,
              )}

              <span className="text-muted-foreground">
                (
                {
                  lead.reviewCount
                }
                )
              </span>
            </span>
          )}

          {lead.phone && (
            <a
              href={`tel:${lead.phone}`}
              className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
            >
              <Phone className="size-3.5" />

              {
                lead.phone
              }
            </a>
          )}
        </div>

        {/* OPPORTUNITY */}

        {proUser ? (
          <div className="mt-4 rounded-xl border border-primary/20 bg-primary/[0.04] px-3.5 py-3">
            <div className="flex items-center justify-between gap-3">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary">
                <TrendingUp className="size-3.5" />

                Opportunity
                score
              </span>

              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
                {
                  leadScore.opportunity
                }{" "}
                ·{" "}
                {
                  leadScore.score
                }
                /100
              </span>
            </div>

            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
              {leadScore
                .reasons[0] ??
                "Review this lead before reaching out."}
            </p>
          </div>
        ) : (
          <button
            type="button"
            onClick={() =>
              gate(
                "Pro opportunity scores",
                "pro",
              )
            }
            className="mt-4 flex w-full items-center justify-between rounded-xl border border-dashed border-border px-3.5 py-3 text-left text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/[0.03] hover:text-foreground"
          >
            <span className="inline-flex items-center gap-1.5">
              <Lock className="size-3.5" />

              See which
              leads to
              contact
              first
            </span>

            <span className="text-primary">
              Pro
            </span>
          </button>
        )}

        {/* PRICE */}

        {estimate ? (
          <div className="mt-4 overflow-hidden rounded-xl border border-primary/20 bg-primary/[0.04]">
            <div className="flex items-start justify-between gap-3 border-b border-primary/10 px-4 py-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Potential
                  Deal
                </p>

                <p className="mt-1 text-2xl font-bold tracking-tight text-primary">
                  {formatNairaCompact(
                    estimate.potentialDealValue,
                  )}
                </p>

                <p className="mt-0.5 text-xs text-muted-foreground">
                  Suggested
                  quote:{" "}
                  {formatNairaCompact(
                    estimate.min,
                  )}{" "}
                  –{" "}
                  {formatNairaCompact(
                    estimate.max,
                  )}
                </p>
              </div>

              <button
                type="button"
                onClick={
                  clearEstimate
                }
                aria-label="Hide estimate"
                className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-px bg-border/50">
              <EstimateCell
                label="Business Size"
                value={
                  estimate.businessSize
                }
              />

              <EstimateCell
                label="Website"
                value={
                  estimate.complexity
                }
              />

              <EstimateCell
                label="Lead Quality"
                value={
                  estimate.leadQuality
                }
              />

              <div className="bg-card px-4 py-3">
                <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  Opportunity
                </p>

                <p className="mt-1 inline-flex items-center gap-1 text-sm font-semibold">
                  <TrendingUp className="size-3.5 text-primary" />

                  {
                    estimate.score
                  }
                  /100
                </p>
              </div>
            </div>

            {estimate.reasons.length >
              0 && (
              <div className="border-t border-primary/10 px-4 py-3">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Why Koda
                  estimates
                  this
                </p>

                <ul className="space-y-1">
                  {estimate.reasons.map(
                    (
                      reason,
                    ) => (
                      <li
                        key={
                          reason
                        }
                        className="flex items-start gap-2 text-xs text-muted-foreground"
                      >
                        <span className="mt-1.5 size-1 shrink-0 rounded-full bg-primary" />

                        {
                          reason
                        }
                      </li>
                    ),
                  )}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="mt-4 w-full border-primary/30 text-primary hover:bg-primary/5"
            onClick={
              estimatePrice
            }
            disabled={
              estimating
            }
          >
            {estimating ? (
              <>
                <Loader2 className="size-4 animate-spin" />

                Estimating...
              </>
            ) : (
              <>
                <Calculator className="size-4" />

                Estimate
                Website
                Price
              </>
            )}
          </Button>
        )}

        {/* ACTIONS */}

        <div className="mt-4 space-y-2">
          {!lead.hasWebsite && (
            <Button
              size="sm"
              className="w-full bg-emerald-600 text-white hover:bg-emerald-700"
              onClick={
                openBuildChoice
              }
              disabled={
                buildingWebsite
              }
            >
              {buildingWebsite ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Wrench className="size-4" />
              )}

              {buildingWebsite
                ? "Creating website…"
                : "Build Website"}
            </Button>
          )}

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Button
              variant={
                saved
                  ? "soft"
                  : "outline"
              }
              size="sm"
              onClick={
                saveLead
              }
              disabled={
                saving ||
                saved
              }
            >
              {saving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : saved ? (
                <BookmarkCheck className="size-4" />
              ) : (
                <Bookmark className="size-4" />
              )}

              {saved
                ? "Saved"
                : "Save"}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                generate(
                  "call_script",
                )
              }
            >
              <PhoneCall className="size-4" />

              Script
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={
                openReviews
              }
              disabled={
                lead.reviewCount ===
                0
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
                href={
                  lead.mapsUrl
                }
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

      {/* BUILD METHOD SHEET */}

      {buildChoiceOpen && (
        <ModalBackdrop
          onClose={() =>
            setBuildChoiceOpen(
              false,
            )
          }
        >
          <div className="w-full max-w-[460px] overflow-hidden rounded-t-[22px] border border-border bg-background shadow-[0_-16px_50px_rgba(0,0,0,0.18)] sm:rounded-[18px] sm:shadow-2xl">
            <div className="relative px-5 pb-4 pt-5 sm:px-6 sm:pt-6">
              <button
                type="button"
                onClick={() =>
                  setBuildChoiceOpen(
                    false,
                  )
                }
                aria-label="Close"
                className="absolute right-4 top-4 flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="size-[17px]" />
              </button>

              <p className="pr-10 text-[18px] font-semibold tracking-[-0.02em] text-foreground">
                Build website
              </p>

              <p className="mt-1 max-w-[340px] text-[13px] leading-5 text-muted-foreground">
                Choose where
                you want to
                create the
                website for{" "}
                {
                  lead.name
                }.
              </p>
            </div>

            <div className="border-t border-border">
              <button
                type="button"
                onClick={
                  buildWebsite
                }
                disabled={
                  buildingWebsite
                }
                className="group flex w-full items-center gap-4 px-5 py-[18px] text-left transition-colors hover:bg-muted/50 active:bg-muted disabled:opacity-50 sm:px-6"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[14px] font-semibold text-foreground">
                      Build with
                      Kodarai
                    </span>

                    <span className="text-[11px] text-muted-foreground">
                      10 credits
                    </span>
                  </div>

                  <p className="mt-1 text-[12px] leading-5 text-muted-foreground">
                    Open
                    Kodarai
                    Studio and
                    generate
                    the site.
                  </p>
                </div>

                {buildingWebsite ? (
                  <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />
                ) : (
                  <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                )}
              </button>

              <div className="mx-5 border-t border-border sm:mx-6" />

              <button
                type="button"
                onClick={
                  generateBuildScript
                }
                className="group flex w-full items-center gap-4 px-5 py-[18px] text-left transition-colors hover:bg-muted/50 active:bg-muted sm:px-6"
              >
                <div className="min-w-0 flex-1">
                  <span className="text-[14px] font-semibold text-foreground">
                    Use another
                    AI builder
                  </span>

                  <p className="mt-1 text-[12px] leading-5 text-muted-foreground">
                    Get build
                    script for
                    Lovable,
                    Bolt,
                    Replit or
                    v0.
                  </p>
                </div>

                <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </button>
            </div>

            <div className="h-[max(8px,env(safe-area-inset-bottom))] sm:hidden" />
          </div>
        </ModalBackdrop>
      )}

      {/* BUILD SCRIPT SHEET */}

      {buildScriptOpen && (
        <ModalBackdrop
          onClose={() =>
            setBuildScriptOpen(
              false,
            )
          }
        >
          <div className="w-full max-w-[560px] overflow-hidden rounded-t-[22px] border border-border bg-background shadow-[0_-16px_50px_rgba(0,0,0,0.18)] sm:rounded-[18px] sm:shadow-2xl">
            <div className="relative px-5 pb-4 pt-5 sm:px-6 sm:pt-6">
              <button
                type="button"
                onClick={() =>
                  setBuildScriptOpen(
                    false,
                  )
                }
                aria-label="Close"
                className="absolute right-4 top-4 flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="size-[17px]" />
              </button>

              <p className="pr-10 text-[18px] font-semibold tracking-[-0.02em] text-foreground">
                Build
                script
              </p>

              <p className="mt-1 truncate pr-8 text-[13px] text-muted-foreground">
                {
                  lead.name
                }
              </p>
            </div>

            {buildScriptLoading ? (
              <div className="flex min-h-[230px] items-center justify-center border-t border-border">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />

                  Preparing
                  script…
                </div>
              </div>
            ) : (
              <>
                <div className="border-y border-border bg-muted/20 p-4 sm:px-6">
                  <div className="max-h-[38vh] overflow-y-auto whitespace-pre-wrap font-mono text-[12px] leading-[1.7] text-foreground">
                    {
                      buildScript
                    }
                  </div>
                </div>

                <div className="px-5 pb-2 pt-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <p className="text-[12px] font-medium text-muted-foreground">
                      Open in
                    </p>

                    <button
                      type="button"
                      onClick={
                        copyBuildScript
                      }
                      className="inline-flex items-center gap-1.5 text-[12px] font-medium text-foreground transition-opacity hover:opacity-60"
                    >
                      {scriptCopied ? (
                        <Check className="size-3.5" />
                      ) : (
                        <Copy className="size-3.5" />
                      )}

                      {scriptCopied
                        ? "Copied"
                        : "Copy script"}
                    </button>
                  </div>
                </div>

                <div className="pb-2">
                  {EXTERNAL_BUILDERS.map(
                    (
                      builder,
                      index,
                    ) => (
                      <div
                        key={
                          builder.id
                        }
                      >
                        {index >
                          0 && (
                          <div className="mx-5 border-t border-border sm:mx-6" />
                        )}

                        <button
                          type="button"
                          disabled={
                            openingBuilder !==
                            null
                          }
                          onClick={() =>
                            openExternalBuilder(
                              builder,
                            )
                          }
                          className="group flex w-full items-center justify-between px-5 py-3.5 text-left transition-colors hover:bg-muted/50 active:bg-muted disabled:opacity-50 sm:px-6"
                        >
                          <span className="text-[14px] font-medium text-foreground">
                            {
                              builder.name
                            }
                          </span>

                          {openingBuilder ===
                          builder.id ? (
                            <Loader2 className="size-4 animate-spin text-muted-foreground" />
                          ) : (
                            <ExternalLink className="size-3.5 text-muted-foreground" />
                          )}
                        </button>
                      </div>
                    ),
                  )}
                </div>

                <div className="border-t border-border px-5 py-4 sm:px-6">
                  <p className="text-[11px] leading-4 text-muted-foreground">
                    The build
                    script is
                    copied
                    before
                    opening the
                    selected
                    builder.
                  </p>
                </div>

                <div className="h-[max(8px,env(safe-area-inset-bottom))] sm:hidden" />
              </>
            )}
          </div>
        </ModalBackdrop>
      )}

      <GenerateDialog
        open={
          dialogOpen
        }
        onOpenChange={
          setDialogOpen
        }
        title={
          dialogTitle
        }
        description={
          dialogDesc
        }
        content={
          content
        }
        loading={
          genLoading
        }
        kind={
          genKind
        }
        businessName={
          lead.name
        }
      />

      <ReviewDialog
        open={
          reviewOpen
        }
        onOpenChange={
          setReviewOpen
        }
        businessName={
          lead.name
        }
        analysis={
          reviewAnalysis
        }
        loading={
          reviewLoading
        }
      />

      <UpgradeDialog
        open={
          upgradeOpen
        }
        onOpenChange={
          setUpgradeOpen
        }
        feature={
          upgradeFeature
        }
        requiredPlan={
          requiredPlan
        }
      />
    </>
  );
}

function EstimateCell({
  label,
  value,
}: {
  label: string;

  value: string;
}) {
  return (
    <div className="bg-card px-4 py-3">
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {
          label
        }
      </p>

      <p className="mt-1 text-sm font-semibold">
        {
          value
        }
      </p>
    </div>
  );
}

function ModalBackdrop({
  children,
  onClose,
}: {
  children:
    ReactNode;

  onClose:
    () => void;
}) {
  if (
    typeof document ===
    "undefined"
  ) {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/55 backdrop-blur-[2px] sm:items-center sm:p-5"
      onMouseDown={(
        event,
      ) => {
        if (
          event.target ===
          event.currentTarget
        ) {
          onClose();
        }
      }}
    >
      <div
        className="relative z-[10000] w-full"
        onMouseDown={(
          event,
        ) =>
          event.stopPropagation()
        }
      >
        {
          children
        }
      </div>
    </div>,

    document.body,
  );
}
