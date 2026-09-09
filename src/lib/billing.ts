// Shared (client + server safe) billing definitions for Kodarai.
// Hybrid model: monthly subscription plans grant a lead allowance that resets
// each cycle, and one-time lead packs add top-up leads that never expire.
// We sell everything as "leads" (1 lead = 1 search credit). Paystack (NGN) only.

export interface Plan {
  id: "starter" | "pro" | "agency";
  name: string;
  tagline: string;
  ngn: number; // monthly price in NGN
  credits: number; // monthly leads
  features: string[];
  highlight?: boolean;
}

export type PaidPlanId = Plan["id"];
export type BillingCycle = "monthly" | "annually";
export type BillingPriceTier = "low" | "high";

export const ANNUAL_DISCOUNT_PERCENT = 20;
// This is public, build-time configuration. Use "low" for launch pricing and
// "high" to restore the original prices after redeploying.
export const BILLING_PRICE_TIER: BillingPriceTier =
  import.meta.env.VITE_BILLING_PRICE_TIER === "high" ? "high" : "low";

const PLAN_RANK: Record<PaidPlanId, number> = {
  starter: 1,
  pro: 2,
  agency: 3,
};

export function hasPlanAccess(
  plan: string | null | undefined,
  minimumPlan: PaidPlanId,
): boolean {
  return (PLAN_RANK[plan as PaidPlanId] ?? 0) >= PLAN_RANK[minimumPlan];
}

export interface Pack {
  id: "pack_small" | "pack_popular" | "pack_power";
  name: string;
  ngn: number;
  credits: number; // one-time leads
  highlight?: boolean;
}

export interface FreePlan {
  id: "free";
  name: string;
  tagline: string;
  credits: number;
  features: string[];
}

export const FREE_PLAN: FreePlan = {
  id: "free",
  name: "Free",
  tagline: "Dashboard access, no searches",
  credits: 0,
  features: [
    "0 lead searches",
    "Full dashboard access",
    "View saved leads",
    "Upgrade any time",
  ],
};

export const PLANS: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    tagline: "Land your first clients",
    ngn: 6500,
    credits: 60,
    features: [
      "60 lead searches each month",
      "Kodarai Studio & Website Builder access",
      "50 Studio AI messages each month",
      "AI website prompts & cold-call scripts",
      "Save leads and manage your pipeline",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    tagline: "For active freelancers",
    ngn: 19000,
    credits: 250,
    highlight: true,
    features: [
      "250 lead searches each month",
      "Kodarai Studio & Website Builder access",
      "200 Studio AI messages each month",
      "Export lead lists to CSV",
      "3-email cold outreach sequences",
      "Branded PDF proposal builder",
    ],
  },
  {
    id: "agency",
    name: "Agency",
    tagline: "For studios & high-volume freelancers",
    ngn: 46000,
    credits: 800,
    features: [
      "800 lead searches each month",
      "Kodarai Studio & Website Builder access",
      "Unlimited Studio AI messages",
      "Bulk CSV lead import",
      "Everything in Pro",
      "Priority support",
    ],
  },
];

const LAUNCH_MONTHLY_PRICES: Record<PaidPlanId, number> = {
  starter: 3500,
  pro: 9500,
  agency: 24000,
};

export function getPlanMonthlyPrice(plan: Plan): number {
  return BILLING_PRICE_TIER === "low"
    ? LAUNCH_MONTHLY_PRICES[plan.id]
    : plan.ngn;
}

export function getPlanPrice(plan: Plan, cycle: BillingCycle): number {
  const monthlyPrice = getPlanMonthlyPrice(plan);
  if (cycle === "monthly") return monthlyPrice;
  return Math.round(monthlyPrice * 12 * (1 - ANNUAL_DISCOUNT_PERCENT / 100));
}

export function getAnnualSavings(plan: Plan): number {
  return getPlanMonthlyPrice(plan) * 12 - getPlanPrice(plan, "annually");
}

export const PACKS: Pack[] = [
  { id: "pack_small", name: "Starter Pack", ngn: 3200, credits: 25 },
  { id: "pack_popular", name: "Popular Pack", ngn: 8000, credits: 80, highlight: true },
  { id: "pack_power", name: "Power Pack", ngn: 16000, credits: 200 },
];

export const PLAN_LABELS: Record<string, string> = {
  none: "No active plan",
  starter: "Starter",
  pro: "Pro",
  agency: "Agency",
};

export function findPlan(id: string | undefined | null): Plan | undefined {
  return PLANS.find((p) => p.id === id);
}

export function findPack(id: string | undefined | null): Pack | undefined {
  return PACKS.find((p) => p.id === id);
}

export function formatNgn(value: number): string {
  return "₦" + value.toLocaleString("en-NG");
}
