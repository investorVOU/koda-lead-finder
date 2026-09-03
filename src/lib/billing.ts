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
