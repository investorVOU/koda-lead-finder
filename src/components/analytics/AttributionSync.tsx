import { useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import {
  clearFunnelAttribution,
  markRegistrationTracked,
  readFunnelAttribution,
  trackSignupCompleted,
  wasRegistrationTracked,
} from "@/lib/analytics";

export function AttributionSync() {
  const { user } = useAuth();
  const syncingUserId = useRef<string | null>(null);

  useEffect(() => {
    if (!user || syncingUserId.current === user.id) return;
    const funnel = readFunnelAttribution();
    if (!funnel) return;
    const syncKey = `kodarai_ad_funnel_synced:${user.id}`;
    try {
      if (localStorage.getItem(syncKey) === "1") return;
    } catch {
      // Continue: auth metadata remains the durable source of attribution.
    }

    syncingUserId.current = user.id;
    const metadata = {
      ...(funnel.source ? { acquisition_source: funnel.source } : {}),
      ...(funnel.experience ? { onboarding_experience: funnel.experience } : {}),
      ...(funnel.goal ? { onboarding_income_goal: funnel.goal } : {}),
      ...(funnel.situation ? { onboarding_situation: funnel.situation } : {}),
      ...(funnel.utm_source ? { utm_source: funnel.utm_source } : {}),
      ...(funnel.utm_medium ? { utm_medium: funnel.utm_medium } : {}),
      ...(funnel.utm_campaign ? { utm_campaign: funnel.utm_campaign } : {}),
      ...(funnel.utm_content ? { utm_content: funnel.utm_content } : {}),
      ...(funnel.utm_term ? { utm_term: funnel.utm_term } : {}),
    };

    void supabase.auth.updateUser({ data: metadata }).then(({ error }) => {
      if (error) return;
      if (!wasRegistrationTracked(user.id)) {
        trackSignupCompleted(funnel);
        markRegistrationTracked(user.id);
      }
      try {
        localStorage.setItem(syncKey, "1");
      } catch {
        // Storage is only a best-effort idempotency layer.
      }
      clearFunnelAttribution();
    }).finally(() => {
      syncingUserId.current = null;
    });
  }, [user]);

  return null;
}
