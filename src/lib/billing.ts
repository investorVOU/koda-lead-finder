// Shared client/server-safe billing definitions for Kodarai.
//
// Lead credits and Studio credits are intentionally separate:
//
// Lead credits:
// - consumed by Finder/searches
//
// Studio credits:
// - consumed by Kodarai website generation and AI edits
//
// Paystack handles subscriptions and one-time lead packs.

export interface Plan {
  id:
    | "starter"
    | "pro"
    | "agency";

  name: string;

  tagline: string;

  ngn: number;

  // Monthly Finder lead allowance.
  credits: number;

  features: string[];

  highlight?: boolean;
}

export type PaidPlanId =
  Plan["id"];

export type BillingCycle =
  | "monthly"
  | "annually";

export type BillingPriceTier =
  | "low"
  | "high";

export type StudioCreditAction =
  | "website_build"
  | "ai_edit";

export const ANNUAL_DISCOUNT_PERCENT =
  20;

/*
 * Public build-time configuration.
 *
 * low  = launch pricing
 * high = normal pricing
 */
export const BILLING_PRICE_TIER:
  BillingPriceTier =
  import.meta.env
    .VITE_BILLING_PRICE_TIER ===
  "high"
    ? "high"
    : "low";

/*
 * null means unlimited.
 */
export const STUDIO_CREDIT_LIMITS:
  Record<
    PaidPlanId,
    number | null
  > = {
  starter: 50,
  pro: 200,
  agency: null,
};

/*
 * Cost of Studio actions.
 */
export const STUDIO_CREDIT_COSTS: Record<
  StudioCreditAction,
  number
> = {
  website_build: 10,
  ai_edit: 1,
};

const PLAN_RANK: Record<
  PaidPlanId,
  number
> = {
  starter: 1,
  pro: 2,
  agency: 3,
};

export function hasPlanAccess(
  plan:
    | string
    | null
    | undefined,

  minimumPlan:
    PaidPlanId,
): boolean {
  return (
    (
      PLAN_RANK[
        plan as PaidPlanId
      ] ?? 0
    ) >=
    PLAN_RANK[
      minimumPlan
    ]
  );
}

export interface Pack {
  id:
    | "pack_small"
    | "pack_popular"
    | "pack_power";

  name: string;

  ngn: number;

  // One-time Finder leads.
  credits: number;

  highlight?: boolean;
}

export interface FreePlan {
  id: "free";

  name: string;

  tagline: string;

  credits: number;

  features: string[];
}

export const FREE_PLAN: FreePlan =
  {
    id: "free",

    name: "Free",

    tagline:
      "Dashboard access, no searches",

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

    tagline:
      "Land your first clients",

    ngn: 6500,

    credits: 60,

    features: [
      "60 lead searches each month",
      "50 Studio credits each month",
      "Kodarai Studio & Website Builder",
      "Full website generation uses 10 Studio credits",
      "AI Studio edits use 1 Studio credit",
      "AI website scripts & cold-call scripts",
      "Save leads and manage your pipeline",
    ],
  },

  {
    id: "pro",

    name: "Pro",

    tagline:
      "For active freelancers",

    ngn: 19000,

    credits: 250,

    highlight: true,

    features: [
      "250 lead searches each month",
      "200 Studio credits each month",
      "Kodarai Studio & Website Builder",
      "Full website generation uses 10 Studio credits",
      "AI Studio edits use 1 Studio credit",
      "Export lead lists to CSV",
      "3-email cold outreach sequences",
      "Branded PDF proposal builder",
    ],
  },

  {
    id: "agency",

    name: "Agency",

    tagline:
      "For studios & high-volume freelancers",

    ngn: 46000,

    credits: 800,

    features: [
      "800 lead searches each month",
      "Unlimited Studio credits",
      "Kodarai Studio & Website Builder",
      "Bulk CSV lead import",
      "Everything in Pro",
      "Priority support",
    ],
  },
];

const LAUNCH_MONTHLY_PRICES:
  Record<
    PaidPlanId,
    number
  > = {
  starter: 3500,
  pro: 9500,
  agency: 24000,
};

export function getPlanMonthlyPrice(
  plan: Plan,
): number {
  return BILLING_PRICE_TIER ===
    "low"
    ? LAUNCH_MONTHLY_PRICES[
        plan.id
      ]
    : plan.ngn;
}

export function getPlanPrice(
  plan: Plan,

  cycle: BillingCycle,
): number {
  const monthlyPrice =
    getPlanMonthlyPrice(
      plan,
    );

  if (
    cycle === "monthly"
  ) {
    return monthlyPrice;
  }

  return Math.round(
    monthlyPrice *
      12 *
      (1 -
        ANNUAL_DISCOUNT_PERCENT /
          100),
  );
}

export function getAnnualSavings(
  plan: Plan,
): number {
  return (
    getPlanMonthlyPrice(
      plan,
    ) *
      12 -
    getPlanPrice(
      plan,
      "annually",
    )
  );
}

export const PACKS: Pack[] = [
  {
    id: "pack_small",

    name: "Starter Pack",

    ngn: 3200,

    credits: 25,
  },

  {
    id: "pack_popular",

    name: "Popular Pack",

    ngn: 8000,

    credits: 80,

    highlight: true,
  },

  {
    id: "pack_power",

    name: "Power Pack",

    ngn: 16000,

    credits: 200,
  },
];

export const PLAN_LABELS:
  Record<
    string,
    string
  > = {
  none:
    "No active plan",

  starter:
    "Starter",

  pro:
    "Pro",

  agency:
    "Agency",
};

export function findPlan(
  id:
    | string
    | undefined
    | null,
): Plan | undefined {
  return PLANS.find(
    (plan) =>
      plan.id === id,
  );
}

export function findPack(
  id:
    | string
    | undefined
    | null,
): Pack | undefined {
  return PACKS.find(
    (pack) =>
      pack.id === id,
  );
}

export function getStudioCreditLimit(
  plan:
    | string
    | null
    | undefined,
): number | null {
  if (
    plan !== "starter" &&
    plan !== "pro" &&
    plan !== "agency"
  ) {
    return 0;
  }

  return STUDIO_CREDIT_LIMITS[
    plan
  ];
}

export function formatNgn(
  value: number,
): string {
  return (
    "₦" +
    value.toLocaleString(
      "en-NG",
    )
  );
}
