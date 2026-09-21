import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getPublicAdSenseSettings } from "@/lib/internal-marketing.functions";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

type AdSenseSettings =
  | { enabled: false }
  | { enabled: true; publisherId: string; landingAdSlot: string | null };

const SCRIPT_ID = "kodarai-adsense-script";

function loadAdSenseScript(publisherId: string, onLoad: () => void) {
  const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
  if (existing) {
    if (existing.dataset.loaded === "true") onLoad();
    else existing.addEventListener("load", onLoad, { once: true });
    return;
  }

  const script = document.createElement("script");
  script.id = SCRIPT_ID;
  script.async = true;
  script.crossOrigin = "anonymous";
  script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(publisherId)}`;
  script.addEventListener(
    "load",
    () => {
      script.dataset.loaded = "true";
      onLoad();
    },
    { once: true },
  );
  document.head.appendChild(script);
}

export function AdSenseUnit() {
  const getSettings = useServerFn(getPublicAdSenseSettings);
  const [settings, setSettings] = useState<AdSenseSettings | null>(null);
  const requested = useRef(false);

  useEffect(() => {
    void getSettings()
      .then(setSettings)
      .catch(() => setSettings(null));
  }, [getSettings]);

  useEffect(() => {
    if (!settings?.enabled) return;

    const requestAd = () => {
      if (!settings.landingAdSlot || requested.current) return;
      try {
        window.adsbygoogle = window.adsbygoogle || [];
        window.adsbygoogle.push({});
        requested.current = true;
      } catch (error) {
        console.warn("AdSense ad request could not be started.", error);
      }
    };

    loadAdSenseScript(settings.publisherId, requestAd);
  }, [settings]);

  if (!settings?.enabled || !settings.landingAdSlot) return null;

  return (
    <aside aria-label="Advertisement" className="mx-auto max-w-6xl px-4 py-7 sm:py-10">
      <p className="mb-2 text-center text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
        Advertisement
      </p>
      <ins
        className="adsbygoogle block min-h-[90px] w-full overflow-hidden"
        data-ad-client={settings.publisherId}
        data-ad-slot={settings.landingAdSlot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </aside>
  );
}
