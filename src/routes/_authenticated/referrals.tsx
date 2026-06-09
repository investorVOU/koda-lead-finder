import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Copy, Check, Gift, Users, Zap, Trophy, Share2 } from "lucide-react";
import { toast } from "sonner";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/referrals")({
  head: () => ({ meta: [{ title: "Refer & Earn — Kodarai" }] }),
  component: ReferralsPage,
});

const CREDIT_REWARD = 10;

const HOW_IT_WORKS = [
  { icon: Share2, title: "Share your link", desc: "Copy your unique referral link and share it with freelancers, designers, or anyone who needs clients." },
  { icon: Users, title: "Friend signs up", desc: "When someone creates a Kodarai account using your link, they're tracked as your referral." },
  { icon: Gift, title: "You both earn", desc: `You get ${CREDIT_REWARD} free leads the moment they complete onboarding. No limits on referrals.` },
];

function ReferralsPage() {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const referralCode = user?.id?.replace(/-/g, "").slice(0, 8).toUpperCase() ?? "";
  const shareUrl = `${window.location.origin}/signup?ref=${referralCode}`;

  const { data: referrals } = useQuery({
    queryKey: ["referrals", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("referrals")
        .select("id, credited, created_at")
        .eq("referrer_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) return [] as { id: string; credited: boolean; created_at: string }[];
      return (data ?? []) as { id: string; credited: boolean; created_at: string }[];
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

  const copyCode = () => {
    navigator.clipboard.writeText(referralCode);
    setCopiedCode(true);
    toast.success("Code copied!");
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <DashboardShell>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Refer & Earn</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Share Kodarai with friends and earn free leads for every signup.
        </p>
      </div>

      <div className="mx-auto max-w-2xl space-y-6">

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { icon: Users, label: "Referred", value: totalReferrals, accent: false },
            { icon: Trophy, label: "Credited", value: creditedReferrals, accent: false },
            { icon: Gift, label: "Credits earned", value: creditsEarned, accent: true },
          ].map(({ icon: Icon, label, value, accent }) => (
            <div key={label} className={`rounded-2xl border p-4 text-center ${accent ? "border-primary/40 bg-primary/5" : "border-border bg-card"}`}>
              <Icon className={`mx-auto size-5 ${accent ? "text-primary" : "text-muted-foreground"}`} />
              <p className={`mt-2 text-2xl font-bold ${accent ? "text-primary" : "text-foreground"}`}>{value}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>

        {/* Share card */}
        <div className="rounded-2xl border border-primary/30 bg-card p-6">
          <div className="flex items-center gap-2 mb-1">
            <Gift className="size-4 text-primary" />
            <h2 className="font-semibold">Your referral link</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Anyone who signs up via this link gets tracked as your referral. You earn{" "}
            <strong className="text-foreground">{CREDIT_REWARD} free leads</strong> per friend.
          </p>

          {/* Code chip */}
          <div className="mb-3 flex items-center gap-2">
            <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/40 px-3 py-2 flex-1">
              <p className="text-xs text-muted-foreground shrink-0">Your code:</p>
              <code className="font-mono font-bold tracking-widest text-sm text-foreground flex-1">{referralCode}</code>
              <Button variant="ghost" size="sm" className="gap-1 text-xs h-7 px-2 shrink-0" onClick={copyCode}>
                {copiedCode ? <Check className="size-3 text-green-500" /> : <Copy className="size-3" />}
                Copy
              </Button>
            </div>
          </div>

          {/* Full URL */}
          <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/40 px-3 py-2">
            <p className="text-xs text-muted-foreground truncate flex-1">{shareUrl}</p>
            <Button variant="hero" size="sm" className="shrink-0 gap-1.5" onClick={copyLink}>
              {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
              {copied ? "Copied!" : "Copy link"}
            </Button>
          </div>

          <p className="mt-3 text-[11px] text-muted-foreground">
            Share on WhatsApp, X, LinkedIn, or anywhere your network is.
          </p>
        </div>

        {/* How it works */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <h2 className="mb-5 font-semibold">How it works</h2>
          <div className="space-y-4">
            {HOW_IT_WORKS.map(({ icon: Icon, title, desc }, i) => (
              <div key={title} className="flex items-start gap-4">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <Icon className="size-4 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-muted-foreground">STEP {i + 1}</span>
                  </div>
                  <p className="text-sm font-medium">{title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Referral history */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="size-4 text-primary" />
            <h2 className="font-semibold">Referral history</h2>
            <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              {totalReferrals} total
            </span>
          </div>

          {totalReferrals === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Users className="size-8 text-muted-foreground/40" />
              <p className="mt-3 text-sm font-medium">No referrals yet</p>
              <p className="mt-1 text-xs text-muted-foreground">Share your link to start earning free leads.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {referrals?.map((r, i) => (
                <div key={r.id} className="flex items-center justify-between rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm">
                  <div className="flex items-center gap-3">
                    <span className="flex size-6 items-center justify-center rounded-full bg-accent text-xs font-bold text-muted-foreground">
                      {i + 1}
                    </span>
                    <span className="text-muted-foreground">
                      {new Date(r.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </span>
                  </div>
                  <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${r.credited ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                    {r.credited ? `+${CREDIT_REWARD} leads` : "Pending"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
