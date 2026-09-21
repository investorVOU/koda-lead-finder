import { useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { recordMarketingVisitorSession } from "@/lib/internal-marketing.functions";

const VISITOR_ID_KEY = "kodarai_marketing_visitor_id";
const cleanDimension = (value: string | null, maxLength: number) =>
  value
    ?.trim()
    .replace(/[^A-Za-z0-9._ -]/g, "")
    .slice(0, maxLength) || undefined;

function visitorId() {
  try {
    const existing = localStorage.getItem(VISITOR_ID_KEY);
    if (existing) return existing;
    const created = crypto.randomUUID();
    localStorage.setItem(VISITOR_ID_KEY, created);
    return created;
  } catch {
    return crypto.randomUUID();
  }
}

function attribution() {
  const params = new URLSearchParams(window.location.search);
  const utmSource = cleanDimension(params.get("utm_source"), 80);
  const referrerHost = (() => {
    try {
      const host = new URL(document.referrer).hostname.replace(/^www\./i, "");
      return host && host !== window.location.hostname.replace(/^www\./i, "")
        ? cleanDimension(host, 80)
        : undefined;
    } catch {
      return undefined;
    }
  })();
  return {
    source: utmSource ?? referrerHost ?? "direct",
    medium: cleanDimension(params.get("utm_medium"), 80) ?? (referrerHost ? "referral" : "direct"),
    campaign: cleanDimension(params.get("utm_campaign"), 160),
  };
}

export function MarketingVisitorTracker() {
  const recordVisitor = useServerFn(recordMarketingVisitorSession);

  useEffect(() => {
    const source = attribution();
    void recordVisitor({
      data: {
        visitorId: visitorId(),
        ...source,
        landingPath: window.location.pathname,
      },
    }).catch(() => undefined);
  }, [recordVisitor]);

  return null;
}
