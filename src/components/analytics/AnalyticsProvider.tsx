import { useEffect } from "react";
import { useRouterState } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { initializeGoogleAnalytics, initializePixels, trackPageView } from "@/lib/analytics";
import { getPublicGoogleAnalyticsSettings } from "@/lib/internal-marketing.functions";

export function AnalyticsProvider() {
  const getGoogleAnalyticsSettings = useServerFn(getPublicGoogleAnalyticsSettings);
  const locationKey = useRouterState({
    select: (state) => `${state.location.pathname}${state.location.searchStr}`,
  });

  useEffect(() => {
    initializePixels(import.meta.env.VITE_META_PIXEL_ID, import.meta.env.VITE_TIKTOK_PIXEL_ID);
    void getGoogleAnalyticsSettings()
      .then((settings) => initializeGoogleAnalytics(settings.measurementId))
      .catch(() => undefined);
  }, [getGoogleAnalyticsSettings]);

  useEffect(() => {
    trackPageView(locationKey);
  }, [locationKey]);

  return null;
}
