import {
  createFileRoute,
  Outlet,
  useLocation,
  useNavigate,
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
   * 1. Not authenticated
   */
  useEffect(() => {
    if (!loading && !user) {
      navigate({ to: "/login" });
    }
  }, [user, loading, navigate]);

  /*
   * 2. Authenticated routing
   */
  useEffect(() => {
    if (!user || !profile || profileLoading || subLoading) {
      return;
    }

    const pathname = location.pathname;

    /*
     * These pages are intentionally accessible without
     * completing onboarding or choosing a plan.
     */
    const exemptPaths = [
      "/welcome",
      "/onboarding",
      "/choose-plan",
      "/billing",
    ];

    if (exemptPaths.includes(pathname)) {
      /*
       * Special case: if a user with an active plan lands on
       * /choose-plan, send them to the dashboard instead of
       * showing the plan picker again.
       */
      if (pathname === "/choose-plan") {
        const hasAccess =
          sub?.status === "active" ||
          sub?.status === "canceling";

        if (hasAccess) {
          navigate({ to: "/dashboard" });
        }
      }

      return;
    }

    if (!profile.onboarded) {
      navigate({ to: "/welcome" });
      return;
    }

    const hasPaidAccess =
      sub?.status === "active" || sub?.status === "canceling";

    if (!hasPaidAccess) {
      navigate({ to: "/choose-plan" });
      return;
    }

    return;
  }, [
    user,
    profile,
    sub,
    profileLoading,
    subLoading,
    location.pathname,
    navigate,
  ]);

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
