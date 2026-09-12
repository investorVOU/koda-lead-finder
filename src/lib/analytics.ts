export type AnalyticsProperties = Record<string, string | number | boolean | undefined>;

export type FunnelAttribution = {
  source?: string;
  experience?: string;
  goal?: string;
  situation?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  created_at?: string;
};

export type CheckoutAttribution = {
  plan: string;
  currency: string;
  value: number;
  started_at: string;
};

type MetaPixel = ((action: "init" | "track" | "trackCustom", event: string, properties?: AnalyticsProperties) => void) & {
  callMethod?: (...args: unknown[]) => void;
  queue?: unknown[][];
  push?: (...args: unknown[]) => void;
  loaded?: boolean;
  version?: string;
};

type TikTokPixelQueue = unknown[] & {
  _u?: string;
};

type TikTokPixel = unknown[] & {
  track?: (event: string, properties?: AnalyticsProperties) => void;
  page?: () => void;
  load?: (pixelId: string) => void;
  _i?: Record<string, TikTokPixelQueue>;
  _t?: Record<string, number>;
  _o?: Record<string, Record<string, unknown>>;
  methods?: string[];
  setAndDefer?: (target: TikTokPixel, method: string) => void;
};

declare global {
  interface Window {
    fbq?: MetaPixel;
    ttq?: TikTokPixel;
    TiktokAnalyticsObject?: string;
    __kodaraiAnalytics?: {
      metaInitialized?: boolean;
      tiktokInitialized?: boolean;
      lastPageView?: string;
      signupStarted?: boolean;
    };
  }
}

export const FUNNEL_STORAGE_KEY = "kodarai_ad_funnel";

const registrationKey = (userId: string) => `kodarai_registration_tracked:${userId}`;
const PENDING_CHECKOUT_KEY = "kodarai_pending_checkout";
const SIGNUP_STARTED_KEY = "kodarai_signup_started";

const safeStorage = () => {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

const safeSessionStorage = () => {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
};

const cleanProperties = (properties: AnalyticsProperties = {}) =>
  Object.fromEntries(
    Object.entries(properties).filter(([key, value]) => {
      const normalized = key.toLowerCase();
      const sensitive = /email|password|phone|full.?name|user.?id|lead.?id|address|token|prompt|code/.test(normalized);
      return value !== undefined && !sensitive;
    }),
  ) as AnalyticsProperties;

function analyticsState() {
  if (typeof window === "undefined") return null;
  window.__kodaraiAnalytics ??= {};
  return window.__kodaraiAnalytics;
}

export function readFunnelAttribution(): FunnelAttribution | null {
  const storage = safeStorage();
  if (!storage) return null;
  try {
    const value = storage.getItem(FUNNEL_STORAGE_KEY);
    return value ? (JSON.parse(value) as FunnelAttribution) : null;
  } catch {
    return null;
  }
}

export function saveFunnelAttribution(data: FunnelAttribution) {
  try {
    safeStorage()?.setItem(FUNNEL_STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Attribution must never interrupt the funnel.
  }
}

export function clearFunnelAttribution() {
  try {
    safeStorage()?.removeItem(FUNNEL_STORAGE_KEY);
  } catch {
    // Attribution must never interrupt authentication.
  }
}

export function wasRegistrationTracked(userId: string) {
  try {
    return safeStorage()?.getItem(registrationKey(userId)) === "1";
  } catch {
    return false;
  }
}

export function markRegistrationTracked(userId: string) {
  try {
    safeStorage()?.setItem(registrationKey(userId), "1");
  } catch {
    // Event deduplication is best effort when storage is unavailable.
  }
}

export function rememberCheckout(data: Omit<CheckoutAttribution, "started_at">) {
  try {
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(PENDING_CHECKOUT_KEY, JSON.stringify({ ...data, started_at: new Date().toISOString() }));
    }
  } catch {
    // Checkout is never dependent on analytics storage.
  }
}

export function readPendingCheckout(): CheckoutAttribution | null {
  try {
    if (typeof window === "undefined") return null;
    const value = window.sessionStorage.getItem(PENDING_CHECKOUT_KEY);
    return value ? (JSON.parse(value) as CheckoutAttribution) : null;
  } catch {
    return null;
  }
}

export function clearPendingCheckout() {
  try {
    if (typeof window !== "undefined") window.sessionStorage.removeItem(PENDING_CHECKOUT_KEY);
  } catch {
    // Best-effort cleanup only.
  }
}

function trackOnce(storageKey: string, callback: () => void) {
  try {
    const storage = safeStorage();
    if (storage?.getItem(storageKey) === "1") return;
    storage?.setItem(storageKey, "1");
  } catch {
    // Event can still be useful if localStorage is unavailable.
  }
  callback();
}

export function initializePixels(metaPixelId?: string, tiktokPixelId?: string) {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  const state = analyticsState();
  if (!state) return;

  try {
    if (metaPixelId && !state.metaInitialized) {
      const existing = window.fbq;
      const fbq: MetaPixel = existing ?? Object.assign(
        ((...args: unknown[]) => {
          if (fbq.callMethod) fbq.callMethod(...args);
          else fbq.queue?.push(args);
        }) as MetaPixel,
        { queue: [] as unknown[][], loaded: false, version: "2.0" },
      );
      window.fbq = fbq;
      fbq("init", metaPixelId);
      if (!document.querySelector("script[data-kodarai-meta-pixel]")) {
        const script = document.createElement("script");
        script.async = true;
        script.src = "https://connect.facebook.net/en_US/fbevents.js";
        script.dataset.kodaraiMetaPixel = "true";
        document.head.appendChild(script);
      }
      state.metaInitialized = true;
    }

    if (tiktokPixelId && !state.tiktokInitialized) {
      const ttq = window.ttq ?? Object.assign([], {
        _i: {},
        _t: {},
        _o: {},
        methods: ["page", "track", "identify", "instances", "debug", "on", "off", "once", "ready", "alias", "group", "enableCookie", "disableCookie"],
      }) as TikTokPixel;
      window.ttq = ttq;
      window.TiktokAnalyticsObject = "ttq";
      ttq._i ??= {};
      ttq._t ??= {};
      ttq._o ??= {};
      ttq._i[tiktokPixelId] ??= Object.assign([], {
        _u: "https://analytics.tiktok.com/i18n/pixel/events.js",
      });
      ttq._t[tiktokPixelId] ??= Date.now();
      ttq._o[tiktokPixelId] ??= {};
      const deferredMethods = ttq as unknown as Record<string, unknown>;
      for (const method of ttq.methods ?? []) {
        if (!deferredMethods[method]) {
          deferredMethods[method] = (...args: unknown[]) => ttq.push([method, ...args]);
        }
      }
      if (!document.querySelector("script[data-kodarai-tiktok-pixel]")) {
        const script = document.createElement("script");
        script.async = true;
        script.src = `https://analytics.tiktok.com/i18n/pixel/events.js?sdkid=${encodeURIComponent(tiktokPixelId)}&lib=ttq`;
        script.dataset.kodaraiTiktokPixel = "true";
        document.head.appendChild(script);
      }
      state.tiktokInitialized = true;
    }
  } catch {
    // Pixel loading is deliberately non-blocking (including ad blockers).
  }
}

export function trackPageView(locationKey = typeof window === "undefined" ? "" : `${window.location.pathname}${window.location.search}`) {
  const state = analyticsState();
  if (!state || state.lastPageView === locationKey) return;
  state.lastPageView = locationKey;
  try {
    window.fbq?.("track", "PageView");
    window.ttq?.page?.();
  } catch {
    // Tracking must not affect navigation.
  }
}

const metaStandardEvents = new Set(["CompleteRegistration", "Search", "InitiateCheckout", "Purchase"]);
const tiktokStandardEvents: Record<string, string> = {
  CompleteRegistration: "CompleteRegistration",
  Search: "Search",
  InitiateCheckout: "InitiateCheckout",
  Purchase: "CompletePayment",
};

export function trackEvent(eventName: string, properties?: AnalyticsProperties) {
  if (typeof window === "undefined") return;
  const safeProperties = cleanProperties(properties);
  try {
    if (metaStandardEvents.has(eventName)) window.fbq?.("track", eventName, safeProperties);
    else window.fbq?.("trackCustom", eventName, safeProperties);
    window.ttq?.track?.(tiktokStandardEvents[eventName] ?? eventName, safeProperties);
    emitInternalEvent(eventName, safeProperties);
  } catch {
    // Pixels and optional in-browser listeners cannot affect product flows.
  }
}

function emitInternalEvent(eventName: string, properties: AnalyticsProperties) {
  try {
    window.dispatchEvent(new CustomEvent("kodarai:analytics", { detail: { eventName, properties } }));
  } catch {
    // Optional in-browser analytics listeners are non-blocking.
  }
}

export const trackFunnelViewed = () => trackEvent("funnel_viewed");
export const trackFunnelStarted = () => trackEvent("funnel_started");
export const trackStartReviewsViewed = () => trackEvent("start_reviews_viewed");
export const trackStartReviewChanged = (review_position: number) => trackEvent("start_review_changed", { review_position });
export const trackStartProofViewed = () => trackEvent("start_proof_viewed");
export const trackStartProofChanged = (proof_position: number, result_type?: string) => trackEvent("start_proof_changed", { proof_position, result_type });
export const trackStartProofCtaClicked = () => trackEvent("start_proof_cta_clicked");
export const trackFunnelExperienceSelected = (experience: string) => trackEvent("funnel_experience_selected", { experience });
export const trackFunnelGoalSelected = (goal: string) => trackEvent("funnel_goal_selected", { goal });
export const trackFunnelSituationSelected = (situation: string) => trackEvent("funnel_situation_selected", { situation });
export const trackFunnelCompleted = (data: FunnelAttribution) => trackEvent("funnel_completed", {
  experience: data.experience,
  goal: data.goal,
  situation: data.situation,
  utm_source: data.utm_source,
  utm_campaign: data.utm_campaign,
  utm_content: data.utm_content,
});
export const trackSignupStarted = (data?: FunnelAttribution) => {
  const state = analyticsState();
  if (!state || state.signupStarted) return;
  try {
    if (safeSessionStorage()?.getItem(SIGNUP_STARTED_KEY) === "1") return;
    safeSessionStorage()?.setItem(SIGNUP_STARTED_KEY, "1");
  } catch {
    // A per-page guard still prevents duplicate effects when storage is unavailable.
  }
  state.signupStarted = true;
  trackEvent("signup_started", { source: data?.source, utm_source: data?.utm_source, utm_campaign: data?.utm_campaign });
};
export const trackSignupSubmitted = (data?: FunnelAttribution) => trackEvent("signup_submitted", { source: data?.source, utm_source: data?.utm_source, utm_campaign: data?.utm_campaign, utm_content: data?.utm_content, experience: data?.experience, goal: data?.goal, situation: data?.situation });
export const trackSignupCompleted = (data?: FunnelAttribution) => {
  const properties = { source: data?.source ?? "direct", utm_source: data?.utm_source, utm_campaign: data?.utm_campaign, utm_content: data?.utm_content, experience: data?.experience, goal: data?.goal, situation: data?.situation };
  emitInternalEvent("signup_completed", cleanProperties(properties));
  trackEvent("CompleteRegistration", properties);
};
export const trackFinderSearch = (data: { category: string; state?: string; city?: string; website_filter: string }) => {
  emitInternalEvent("finder_search", cleanProperties(data));
  trackEvent("Search", data);
};
export const trackFirstFinderSearch = (userId?: string) => trackOnce(`kodarai_first_finder_search_tracked:${userId ?? "device"}`, () => trackEvent("first_finder_search"));
export const trackWebsiteGenerated = (data: { template?: string; category?: string; source?: string }) => trackEvent("website_generated", data);
export const trackFirstWebsiteGenerated = (userId?: string) => trackOnce(`kodarai_first_website_generated_tracked:${userId ?? "device"}`, () => trackEvent("first_website_generated"));
export const trackCheckoutStarted = (data: { plan: string; currency: string; value: number }) => {
  emitInternalEvent("checkout_started", data);
  trackEvent("InitiateCheckout", data);
};
export const trackPurchase = (data: { plan: string; currency: string; value: number }, paymentId: string) => trackOnce(`kodarai_purchase_tracked:${paymentId}`, () => {
  emitInternalEvent("purchase", data);
  trackEvent("Purchase", data);
});
