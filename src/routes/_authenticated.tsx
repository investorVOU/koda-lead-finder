import { createFileRoute, Outlet, useNavigate, useLocation } from "@tanstack/react-router";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useProfile, useSubscription } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedLayout,
});

function FullScreenLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Loader2 className="size-7 animate-spin text-primary" />
    </div>
  );
}

function AuthenticatedLayout() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { data: profile, isLoading: profileLoading } = useProfile(user?.id);
  const { data: sub, isLoading: subLoading } = useSubscription(user?.id);

  useEffect(() => {
    if (!loading && !user) {
      navigate({ to: "/login" });
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user || !profile || subLoading) return;

    const exempt = ["/onboarding", "/trial-welcome", "/choose-plan", "/billing"];
    if (exempt.includes(location.pathname)) return;

    // A user has access if they've completed onboarding (free trial path)
    // OR they have any paid entitlement recorded in `subscriptions`
    // (active plan, a canceling-but-not-yet-expired plan, or leftover credits/topup).
    const hasActivePlan = sub?.status === "active" || sub?.status === "canceling";
    const hasCredits = (sub?.topup_credits ?? 0) > 0;
    const hasAccess = profile.onboarded || hasActivePlan || hasCredits;

    if (!hasAccess) {
      navigate({ to: "/choose-plan" });
    }
  }, [user, profile, sub, subLoading, location.pathname, navigate]);

  if (loading || !user || profileLoading || subLoading) return <FullScreenLoader />;

  return <Outlet />;
}
