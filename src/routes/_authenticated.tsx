import {
  createFileRoute,
  Outlet,
  useNavigate,
  useLocation,
} from "@tanstack/react-router";
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

  const { data: profile, isLoading: profileLoading } = useProfile(
    user?.id,
  );

  const { data: sub, isLoading: subLoading } = useSubscription(
    user?.id,
  );

  /*
   * If the user is not authenticated,
   * send them back to login.
   */
  useEffect(() => {
    if (!loading && !user) {
      navigate({ to: "/login" });
    }
  }, [user, loading, navigate]);

  /*
   * Handle the authenticated-user flow.
   */
  useEffect(() => {
    if (!user || !profile || subLoading) return;

    const path = location.pathname;

    /*
     * These routes are allowed without an active plan.
     *
     * Welcome and onboarding are part of the new-user flow.
     * Choose-plan and billing are allowed so the user can
     * actually purchase/access a plan.
     */
    const exemptRoutes = [
      "/welcome",
      "/onboarding",
      "/trial-welcome",
      "/choose-plan",
      "/billing",
    ];

    if (exemptRoutes.includes(path)) {
      return;
    }

    /*
     * NEW USER
     *
     * If the user hasn't completed the existing onboarding,
     * they must first see the new Welcome page.
     */
    if (!profile.onboarded) {
      navigate({
        to: "/welcome",
      });

      return;
    }

    /*
     * EXISTING USER
     *
     * The user has already completed onboarding.
     *
     * They only get access to the actual application if they
     * have an active/canceling subscription or top-up credits.
     */
    const hasActivePlan =
      sub?.status === "active" ||
      sub?.status === "canceling";

    const hasCredits =
      (sub?.topup_credits ?? 0) > 0;

    const hasAccess =
      hasActivePlan || hasCredits;

    /*
     * Existing user with no active access:
     * send them to choose a plan.
     */
    if (!hasAccess) {
      navigate({
        to: "/choose-plan",
      });
    }
  }, [
    user,
    profile,
    sub,
    subLoading,
    location.pathname,
    navigate,
  ]);

  /*
   * Wait until authentication, profile and subscription
   * information have loaded before rendering the app.
   */
  if (
    loading ||
    !user ||
    profileLoading ||
    subLoading
  ) {
    return <FullScreenLoader />;
  }

  return <Outlet />;
}
