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
