import { useEffect } from "react";
import { useRouterState } from "@tanstack/react-router";
import { initializePixels, trackPageView } from "@/lib/analytics";

export function AnalyticsProvider() {
  const locationKey = useRouterState({
    select: (state) => `${state.location.pathname}${state.location.searchStr}`,
  });

  useEffect(() => {
    initializePixels(import.meta.env.VITE_META_PIXEL_ID, import.meta.env.VITE_TIKTOK_PIXEL_ID);
  }, []);

  useEffect(() => {
    trackPageView(locationKey);
  }, [locationKey]);

  return null;
}
