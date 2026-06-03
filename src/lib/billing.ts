// Shared (client + server safe) billing definitions for KodaRai.
// Hybrid model: monthly subscription plans grant a lead allowance that resets
// each cycle, and one-time lead packs add top-up leads that never expire.
// We sell everything as "leads" (1 lead = 1 search credit).

export type Provider = "stripe" | "paystack";

export interface Plan {
  id: "starter" | "pro" | "agency";
  name: string;
  tagline: string;
  usd: number; // monthly price in USD
  ngn: number; // monthly price in NGN
  credits: number; // monthly leads
  features: string[];
  highlight?: boolean;
}

export interface Pack {
  id: "pack_small" | "pack_popular" | "pack_power";
  name: string;
  usd: number;
  ngn: number;
  credits: number; // one-time leads
  highlight?: boolean;
}

export const PLANS: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    tagline: "Land your first clients",
    usd: 4,
    ngn: 6500,
    credits: 60,
    features: ["60 leads / month", "AI website prompts", "Cold call scripts", "Save leads to pipeline"],
  },
  {
    id: "pro",
    name: "Pro",
    tagline: "For active freelancers",
    usd: 12,
    ngn: 19000,
    credits: 250,
    highlight: true,
    features: [
      "250 leads / month",
      "Everything in Starter",
      "Export leads",
      "Priority AI prompts",
      "Cold email generator",
    ],
  },
  {
    id: "agency",
    name: "Agency",
    tagline: "For teams & power users",
    usd: 29,
    ngn: 46000,
    credits: 800,
    features: [
      "800 leads / month",
      "Everything in Pro",
      "Bulk search & export",
      "Advanced filtering",
      "Priority support",
    ],
  },
];

export const PACKS: Pack[] = [
  { id: "pack_small", name: "Starter Pack", usd: 2, ngn: 3200, credits: 25 },
  { id: "pack_popular", name: "Popular Pack", usd: 5, ngn: 8000, credits: 80, highlight: true },
  { id: "pack_power", name: "Power Pack", usd: 10, ngn: 16000, credits: 200 },
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
