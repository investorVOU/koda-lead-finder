import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Copy, Check, Gift, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

const CREDIT_REWARD = 10; // credits per successful referral

export function ReferralCard() {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);

  // Deterministic referral code from user UUID
  const referralCode = user?.id?.replace(/-/g, "").slice(0, 8).toUpperCase() ?? "";
  const shareUrl = `${window.location.origin}/signup?ref=${referralCode}`;

  // Count referrals from DB (requires migration to be applied)
  const { data: referrals } = useQuery({
    queryKey: ["referrals", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      // Table created by migration 20260608000000_follow_up_referral.sql
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("referrals")
        .select("id, credited")
        .eq("referrer_id", user!.id);
      if (error) return [] as { id: string; credited: boolean }[];
      return (data ?? []) as { id: string; credited: boolean }[];
    },
  });

  const totalReferrals = referrals?.length ?? 0;
  const creditedReferrals = referrals?.filter((r) => r.credited).length ?? 0;
  const creditsEarned = creditedReferrals * CREDIT_REWARD;

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast.success("Referral link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Gift className="size-4 text-primary" />
            <h3 className="font-semibold">Refer & Earn</h3>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Share your link — earn <strong className="text-foreground">{CREDIT_REWARD} free leads</strong> for every friend who joins.
          </p>
        </div>
        <div className="flex items-center gap-3 text-center">
          <div className="flex flex-col items-center">
            <Users className="size-4 text-muted-foreground" />
            <p className="mt-0.5 text-xl font-bold">{totalReferrals}</p>
            <p className="text-[10px] text-muted-foreground">Referred</p>
          </div>
          <div className="h-8 w-px bg-border" />
          <div className="flex flex-col items-center">
            <Gift className="size-4 text-primary" />
            <p className="mt-0.5 text-xl font-bold text-primary">{creditsEarned}</p>
            <p className="text-[10px] text-muted-foreground">Credits earned</p>
          </div>
        </div>
      </div>

      <div className="mt-4">
        <p className="mb-1.5 text-xs font-medium text-muted-foreground">Your referral code</p>
        <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/40 px-3 py-2">
          <code className="flex-1 font-mono text-sm font-semibold tracking-widest text-foreground">
            {referralCode}
          </code>
          <span className="text-xs text-muted-foreground">|</span>
          <p className="min-w-0 flex-[2] truncate text-xs text-muted-foreground">{shareUrl}</p>
          <Button variant="outline" size="sm" className="shrink-0 gap-1.5" onClick={copyLink}>
            {copied ? <Check className="size-3.5 text-green-500" /> : <Copy className="size-3.5" />}
            {copied ? "Copied!" : "Copy link"}
          </Button>
        </div>
      </div>

      <p className="mt-3 text-[11px] text-muted-foreground">
        Credits are added automatically when your referred friend completes onboarding.
      </p>
    </div>
  );
}
