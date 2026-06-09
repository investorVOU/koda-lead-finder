import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Radar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useProfile } from "@/lib/queries";
import { LEAD_CATEGORY_GROUPS } from "@/lib/constants";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({ meta: [{ title: "Welcome — Kodarai" }] }),
  component: OnboardingPage,
});

function OnboardingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: profile } = useProfile(user?.id);

  const [fullName, setFullName] = useState("");
  const [company, setCompany] = useState("");
  const [niche, setNiche] = useState("");
  const [location, setLocation] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? "");
      setCompany(profile.company ?? "");
      if (profile.onboarded) navigate({ to: "/dashboard" });
    }
  }, [profile, navigate]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName,
        company,
        primary_niche: niche,
        target_location: location,
        onboarded: true,
      })
      .eq("id", user.id);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["profile", user.id] });
    toast.success("You're all set! Let's find some leads.");
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[image:var(--gradient-hero)] px-4 py-10">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-8 shadow-[var(--shadow-lg)]">
        <span className="flex size-11 items-center justify-center rounded-xl bg-[image:var(--gradient-primary)] text-primary-foreground">
          <Radar className="size-6" />
        </span>
        <h1 className="mt-5 text-2xl font-bold">Welcome to Kodarai 👋</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Tell us a bit about you so we can tailor your lead search.
        </p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="fullName">Your name</Label>
            <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="company">Company / brand (optional)</Label>
            <Input id="company" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Freelancer or agency name" />
          </div>
          <div className="space-y-1.5">
            <Label>Niche you target most</Label>
            <Select value={niche} onValueChange={setNiche}>
              <SelectTrigger>
                <SelectValue placeholder="Pick a category" />
              </SelectTrigger>
              <SelectContent className="max-h-80">
                {LEAD_CATEGORY_GROUPS.map((group) => (
                  <SelectGroup key={group.group}>
                    <SelectLabel className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {group.group}
                    </SelectLabel>
                    {group.items.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
                <SelectGroup>
                  <SelectLabel className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Other
                  </SelectLabel>
                  <SelectItem value="Other">Other / Custom</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="loc">Main location you serve</Label>
            <Input
              id="loc"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Lagos, Nigeria or Chicago, USA"
            />
          </div>
          <Button type="submit" variant="hero" size="lg" className="w-full" disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : "Enter dashboard"}
          </Button>
        </form>
      </div>
    </div>
  );
}
