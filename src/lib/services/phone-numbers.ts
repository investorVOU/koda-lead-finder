/**
 * Phone number service layer — abstracts Telnyx (rental) and SMSPool (temp).
 * Server-only: uses process.env, never import from client code.
 *
 * Telnyx:  monthly rental numbers (SMS + voice), webhook-delivered inbound
 * SMSPool: cheap one-time temp numbers (OTP/verification), polling-delivered
 */

const TELNYX_BASE  = "https://api.telnyx.com/v2";
const SMSPOOL_BASE = "https://api.smspool.net";

// ── Auth helpers ──────────────────────────────────────────────────────────────

function telnyxHeaders(): Record<string, string> {
  const key = process.env.TELNYX_API_KEY;
  if (!key) throw new Error("TELNYX_API_KEY env var is not set");
  return {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

function smsPoolKey(): string {
  const key = process.env.SMSPOOL_API_KEY;
  if (!key) throw new Error("SMSPOOL_API_KEY env var is not set");
  return key;
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface TelnyxAvailableNumber {
  phoneNumber: string;
  region?: string;
  locality?: string;
  monthlyCostUsd: number;
  upfrontCostUsd: number;
}

export interface TelnyxPurchasedNumber {
  /** Telnyx UUID — store as provider_sid */
  id: string;
  phoneNumber: string;
  status: string;
}

export interface SMSPoolNumber {
  orderId: string;
  phoneNumber: string;
}

export interface SMSPoolService {
  id: string;
  name: string;
}

// ── TELNYX: Search ────────────────────────────────────────────────────────────

export async function searchTelnyxNumbers(
  countryCode: string,
  capabilities: string[] = ["sms"],
): Promise<TelnyxAvailableNumber[]> {
  const params = new URLSearchParams({
    "filter[country_code]": countryCode,
    "filter[limit]":        "10",
    "filter[phone_number_type]": "local",
  });
  // filter[features] accepts an array of capability strings: sms, mms, voice, fax, etc.
  for (const cap of capabilities) {
    params.append("filter[features][]", cap);
  }

  const res = await fetch(`${TELNYX_BASE}/available_phone_numbers?${params}`, {
    headers: telnyxHeaders(),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { errors?: Array<{ detail?: string }> };
    throw new Error(err?.errors?.[0]?.detail ?? `Telnyx search failed (${res.status})`);
  }

  const json = await res.json() as {
    data: Array<{
      phone_number: string;
      region_information?: Array<{ region_type: string; region_name: string }>;
      locality?: string;
      cost_information?: { monthly_cost?: string; upfront_cost?: string };
    }>;
  };

  return (json.data ?? []).map((n) => ({
    phoneNumber: n.phone_number,
    region: n.region_information?.find((r) => r.region_type === "state")?.region_name,
    locality: n.locality,
    monthlyCostUsd: parseFloat(n.cost_information?.monthly_cost ?? "1.00"),
    upfrontCostUsd: parseFloat(n.cost_information?.upfront_cost ?? "1.00"),
  }));
}

// ── TELNYX: Purchase ──────────────────────────────────────────────────────────

export async function purchaseTelnyxNumber(
  phoneNumber: string,
): Promise<TelnyxPurchasedNumber> {
  const profileId = process.env.TELNYX_MESSAGING_PROFILE_ID;
  const body: Record<string, string> = { phone_number: phoneNumber };
  if (profileId) body.messaging_profile_id = profileId;

  const res = await fetch(`${TELNYX_BASE}/phone_numbers`, {
    method: "POST",
    headers: telnyxHeaders(),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { errors?: Array<{ detail?: string }> };
    throw new Error(err?.errors?.[0]?.detail ?? `Telnyx purchase failed (${res.status})`);
  }

  const json = await res.json() as {
    data: { id: string; phone_number: string; status: string };
  };

  return {
    id: json.data.id,
    phoneNumber: json.data.phone_number,
    status: json.data.status,
  };
}

// ── TELNYX: Release ───────────────────────────────────────────────────────────

export async function releaseTelnyxNumber(telnyxNumberId: string): Promise<void> {
  const res = await fetch(`${TELNYX_BASE}/phone_numbers/${telnyxNumberId}`, {
    method: "DELETE",
    headers: telnyxHeaders(),
  });

  // 404 = already removed, treat as success
  if (!res.ok && res.status !== 404) {
    const err = await res.json().catch(() => ({})) as { errors?: Array<{ detail?: string }> };
    throw new Error(err?.errors?.[0]?.detail ?? `Telnyx release failed (${res.status})`);
  }
}

// ── TELNYX: Pricing ───────────────────────────────────────────────────────────

export async function getTelnyxPricing(countryCode: string): Promise<number> {
  try {
    const numbers = await searchTelnyxNumbers(countryCode);
    return numbers[0]?.monthlyCostUsd ?? 1.00;
  } catch {
    return 1.00;
  }
}

// ── SMSPOOL: Request temp number ──────────────────────────────────────────────

export async function requestSMSPoolNumber(
  country: string,
  service: string = "any",
): Promise<SMSPoolNumber> {
  const params = new URLSearchParams({
    key:     smsPoolKey(),
    country,
    service,
  });

  // Correct endpoint: /purchase/sms (verified against SMSPool API docs)
  const res = await fetch(`${SMSPOOL_BASE}/purchase/sms?${params}`);

  if (!res.ok) {
    throw new Error(`SMSPool request failed (${res.status})`);
  }

  const json = await res.json() as {
    success?: number;
    error?: number;
    message?: string;
    order_id?: string | number; // SMSPool uses order_id (not orderId)
    number?: string;            // phone number field is "number" (not phonenumber)
    country?: string;
    service?: string;
    expires_in?: number;
  };

  if (json.error || json.success === 0) {
    throw new Error(json.message ?? "SMSPool number request failed — check balance or country/service availability");
  }

  const orderId     = String(json.order_id ?? "");
  const phoneNumber = json.number ?? "";

  if (!orderId || !phoneNumber) {
    throw new Error("SMSPool returned invalid response — missing order_id or number");
  }

  return { orderId, phoneNumber };
}

// ── SMSPOOL: Poll inbox ───────────────────────────────────────────────────────

/**
 * Poll once. Returns the SMS text if received, null if still waiting.
 * Call every ~5 seconds on the client, up to 20 minutes.
 */
export async function pollSMSPoolInbox(orderId: string): Promise<string | null> {
  const params = new URLSearchParams({
    key:     smsPoolKey(),
    orderid: orderId,
  });

  try {
    const res = await fetch(`${SMSPOOL_BASE}/sms/check?${params}`);
    if (!res.ok) return null;

    const json = await res.json() as {
      sms?:      string;
      full_sms?: string;
      // status is numeric: 1=waiting, 2=received/completed, 3=expired/cancelled
      status?:   number | string;
      code?:     string;
    };

    // Most reliable signal: SMS text present in response
    const text = json.sms ?? json.full_sms;
    if (text && text.trim()) return text;

    return null;
  } catch {
    return null;
  }
}

// ── SMSPOOL: Pricing ──────────────────────────────────────────────────────────

export async function getSMSPoolPricing(): Promise<Record<string, number>> {
  try {
    const params = new URLSearchParams({ key: smsPoolKey() });
    const res = await fetch(`${SMSPOOL_BASE}/country/prices?${params}`);
    if (!res.ok) return {};

    const json = await res.json() as Array<{
      country?: string;
      name?: string;
      price?: string | number;
    }>;

    const result: Record<string, number> = {};
    if (Array.isArray(json)) {
      for (const item of json) {
        const name = item.country ?? item.name ?? "";
        if (name) result[name] = parseFloat(String(item.price ?? "0"));
      }
    }
    return result;
  } catch {
    return {};
  }
}

// ── SMSPOOL: Country + service lists ─────────────────────────────────────────

export async function getSMSPoolCountries(): Promise<Array<{ id: string; name: string }>> {
  try {
    const params = new URLSearchParams({ key: smsPoolKey() });
    // Correct endpoint: /country/retrieve_all (with underscore)
    const res = await fetch(`${SMSPOOL_BASE}/country/retrieve_all?${params}`);
    if (!res.ok) return SMSPOOL_COMMON_COUNTRIES;

    const json = await res.json() as Array<{ ID?: string; name?: string; short_name?: string }>;
    if (!Array.isArray(json)) return SMSPOOL_COMMON_COUNTRIES;

    return json.map((c) => ({
      id: c.short_name ?? c.ID ?? "",
      name: c.name ?? c.short_name ?? "",
    })).filter((c) => c.id);
  } catch {
    return SMSPOOL_COMMON_COUNTRIES;
  }
}

export async function getSMSPoolServices(): Promise<SMSPoolService[]> {
  try {
    const params = new URLSearchParams({ key: smsPoolKey() });
    // Correct endpoint: /service/retrieve_all (with underscore)
    const res = await fetch(`${SMSPOOL_BASE}/service/retrieve_all?${params}`);
    if (!res.ok) return SMSPOOL_COMMON_SERVICES;

    const json = await res.json() as Array<{ ID?: string; name?: string }>;
    if (!Array.isArray(json)) return SMSPOOL_COMMON_SERVICES;

    return json.map((s) => ({
      id: s.ID ?? s.name ?? "",
      name: s.name ?? s.ID ?? "",
    })).filter((s) => s.id);
  } catch {
    return SMSPOOL_COMMON_SERVICES;
  }
}

// ── Shared utilities (re-exported from sms-utils for server callers) ──────────

export { extractOTP, detectService } from "@/lib/sms-utils";

export async function forwardSMS(_numberId: string, _message: string): Promise<void> {
  // TODO: implement via Telnyx outbound messaging API
  // POST /v2/messages { from, to, text }
}

// ── Fallback lists ────────────────────────────────────────────────────────────

const SMSPOOL_COMMON_COUNTRIES = [
  { id: "US", name: "United States" },
  { id: "GB", name: "United Kingdom" },
  { id: "CA", name: "Canada" },
  { id: "NG", name: "Nigeria" },
  { id: "IN", name: "India" },
  { id: "RU", name: "Russia" },
  { id: "UA", name: "Ukraine" },
  { id: "ID", name: "Indonesia" },
  { id: "PH", name: "Philippines" },
  { id: "VN", name: "Vietnam" },
];

const SMSPOOL_COMMON_SERVICES: SMSPoolService[] = [
  { id: "any", name: "Any (cheapest)" },
  { id: "whatsapp", name: "WhatsApp" },
  { id: "telegram", name: "Telegram" },
  { id: "instagram", name: "Instagram" },
  { id: "facebook", name: "Facebook" },
  { id: "twitter", name: "X / Twitter" },
  { id: "google", name: "Google" },
  { id: "microsoft", name: "Microsoft" },
  { id: "tiktok", name: "TikTok" },
  { id: "snapchat", name: "Snapchat" },
  { id: "uber", name: "Uber" },
];
