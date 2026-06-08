import { createFileRoute, Outlet, useNavigate, useLocation } from "@tanstack/react-router";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useProfile } from "@/lib/queries";

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

  useEffect(() => {
    if (!loading && !user) {
      navigate({ to: "/login" });
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    const exempt = ["/onboarding", "/trial-welcome", "/choose-plan"];
    if (user && profile && !profile.onboarded && !exempt.includes(location.pathname)) {
      navigate({ to: "/choose-plan" });
    }
  }, [user, profile, location.pathname, navigate]);

  if (loading || !user || profileLoading) return <FullScreenLoader />;

  return <Outlet />;
}
