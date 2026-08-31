import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/trial-welcome")({
  head: () => ({ meta: [{ title: "Choose your plan - Kodarai" }] }),
  component: LegacyTrialRedirect,
});

function LegacyTrialRedirect() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    navigate({ to: user ? "/dashboard" : "/signup", replace: true });
  }, [loading, navigate, user]);

  return null;
}
