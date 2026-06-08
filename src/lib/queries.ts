import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  company: string | null;
  primary_niche: string | null;
  target_location: string | null;
  onboarded: boolean;
}

export interface Subscription {
  id: string;
  plan: string;
  status: string;
  billing_cycle: string;
  provider: string | null;
  search_credits_total: number;
  search_credits_used: number;
  topup_credits: number;
  credits_reset_at: string;
  current_period_end: string | null;
  trial_ends_at: string | null;
}

export function trialDaysLeft(sub: Subscription | null | undefined): number {
  if (!sub?.trial_ends_at || sub.plan !== "trial") return 0;
  const ms = new Date(sub.trial_ends_at).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

export function isTrialExpired(sub: Subscription | null | undefined): boolean {
  if (!sub?.trial_ends_at || sub.plan !== "trial") return false;
  return new Date(sub.trial_ends_at) < new Date();
}

export interface PaymentRecord {
  id: string;
  provider: string;
  kind: string;
  description: string | null;
  plan_id: string | null;
  amount: number;
  currency: string;
  credits_granted: number;
  status: string;
  created_at: string;
}

export function useProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ["profile", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId!)
        .maybeSingle();
      if (error) throw error;
      return data as Profile | null;
    },
  });
}

export function useSubscription(userId: string | undefined) {
  return useQuery({
    queryKey: ["subscription", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", userId!)
        .maybeSingle();
      if (error) throw error;
      return data as Subscription | null;
    },
  });
}

export function isFreeTrial(sub: Subscription | null | undefined): boolean {
  return !sub || sub.plan === "trial" || sub.status === "pending_plan" || sub.status === "trialing";
}

export function usePaymentHistory(userId: string | undefined) {
  return useQuery({
    queryKey: ["payment-history", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payment_history")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as PaymentRecord[];
    },
  });
}
