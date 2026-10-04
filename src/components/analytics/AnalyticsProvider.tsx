import { useEffect } from "react";
import { useRouterState } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  initializeGoogleAnalytics,
  initializePixels,
  trackInitialPixelPageView,
  trackPageView,
} from "@/lib/analytics";
import {
  getPublicGoogleAnalyticsSettings,
  getPublicMetaPixelSettings,
} from "@/lib/internal-marketing.functions";

export function AnalyticsProvider() {
  const getGoogleAnalyticsSettings = useServerFn(getPublicGoogleAnalyticsSettings);
  const getMetaPixelSettings = useServerFn(getPublicMetaPixelSettings);
  const locationKey = useRouterState({
    select: (state) => `${state.location.pathname}${state.location.searchStr}`,
  });

  useEffect(() => {
    // The Meta Pixel ID is managed in /internal/marketing; the env var is only a fallback.
    const envMetaPixelId = import.meta.env.VITE_META_PIXEL_ID;
    const tiktokPixelId = import.meta.env.VITE_TIKTOK_PIXEL_ID;
    void getMetaPixelSettings()
      .then((settings) => settings.pixelId ?? envMetaPixelId)
      .catch(() => envMetaPixelId)
      .then((metaPixelId) => {
        initializePixels(metaPixelId, tiktokPixelId);
        trackInitialPixelPageView();
      });
    void getGoogleAnalyticsSettings()
      .then((settings) => initializeGoogleAnalytics(settings.measurementId))
      .catch(() => undefined);
  }, [getGoogleAnalyticsSettings, getMetaPixelSettings]);

  useEffect(() => {
    trackPageView(locationKey);
  }, [locationKey]);

  return null;
}
