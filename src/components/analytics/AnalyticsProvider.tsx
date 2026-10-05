import { useEffect } from "react";
import { useRouterState } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  initializeClarity,
  initializeGoogleAnalytics,
  initializePixels,
  trackInitialPixelPageView,
  syncClarityForPath,
  trackPageView,
} from "@/lib/analytics";
import {
  getPublicClaritySettings,
  getPublicGoogleAnalyticsSettings,
  getPublicMetaPixelSettings,
  getPublicTikTokPixelSettings,
} from "@/lib/internal-marketing.functions";

export function AnalyticsProvider() {
  const getGoogleAnalyticsSettings = useServerFn(getPublicGoogleAnalyticsSettings);
  const getMetaPixelSettings = useServerFn(getPublicMetaPixelSettings);
  const getTiktokPixelSettings = useServerFn(getPublicTikTokPixelSettings);
  const getClaritySettings = useServerFn(getPublicClaritySettings);
  const locationKey = useRouterState({
    select: (state) => `${state.location.pathname}${state.location.searchStr}`,
  });

  useEffect(() => {
    // The Meta Pixel ID is managed in /internal/marketing; the env var is only a fallback.
    const envMetaPixelId = import.meta.env.VITE_META_PIXEL_ID;
    const envTiktokPixelId = import.meta.env.VITE_TIKTOK_PIXEL_ID;
    void Promise.all([
      getMetaPixelSettings().then((settings) => settings.pixelId ?? envMetaPixelId).catch(() => envMetaPixelId),
      getTiktokPixelSettings().then((settings) => settings.pixelId ?? envTiktokPixelId).catch(() => envTiktokPixelId),
    ]).then(([metaPixelId, tiktokPixelId]) => {
      initializePixels(metaPixelId, tiktokPixelId);
      trackInitialPixelPageView();
    });
    void getGoogleAnalyticsSettings()
      .then((settings) => initializeGoogleAnalytics(settings.measurementId))
      .catch(() => undefined);
    void getClaritySettings()
      .then((settings) => initializeClarity(settings.projectId))
      .catch(() => undefined);
  }, [getClaritySettings, getGoogleAnalyticsSettings, getMetaPixelSettings, getTiktokPixelSettings]);

  useEffect(() => {
    trackPageView(locationKey);
    syncClarityForPath(locationKey.split("?")[0]);
  }, [locationKey]);

  return null;
}
