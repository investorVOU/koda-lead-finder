/**
 * Phone number service layer â€” abstracts Telnyx (rental) and SMSPool (temp).
 * Server-only: uses process.env, never import from client code.
 *
 * Telnyx:  monthly rental numbers (SMS + voice), webhook-delivered inbound
 * SMSPool: cheap one-time temp numbers (OTP/verification), polling-delivered
 */

const TELNYX_BASE = "https://api.telnyx.com/v2";
const SMSPOOL_BASE = "https://api.smspool.net";

// â”€â”€ Auth helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function telnyxHeaders(): Record<string, string> {
  const key = process.env.TELNYX_API_KEY;
  if (!key) throw new Error("TELNYX_API_KEY env var is not set");
  return {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

export function smsPoolKey(): string {
  const key = process.env.SMSPOOL_API_KEY;
  if (!key) throw new Error("SMSPOOL_API_KEY env var is not set");
  return key;
}

// â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface TelnyxAvailableNumber {
  phoneNumber: string;
  region?: string;
  locality?: string;
  monthlyCostUsd: number;
  upfrontCostUsd: number;
}

export interface TelnyxPurchasedNumber {
  /** Telnyx UUID â€” store as provider_sid */
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

export interface SMSPoolRentalTier {
  rentalId: string;
  name?: string;
  country: string;
  tag?: string;
  region?: string;
  type: 0 | 1;
  serviceId?: string;
  pricing: Record<string, number>;
  pool?: number | null;
  singleService?: string | null;
  singleServiceExtend?: string | null;
  isRefundable?: boolean;
  refundWithin?: number;
  refundMinDays?: number;
}

function normalizeSmsPoolCountry(value: unknown): string {
  const raw = String(value ?? "")
    .trim()
    .toUpperCase();
  const cleaned = raw.replace(/[^A-Z0-9]/g, "");
  if (!cleaned) return "";
  if (cleaned === "USA" || cleaned === "UNITEDSTATES") return "US";
  return cleaned;
}

function parseSmsPoolRentalPricing(value: unknown): Record<string, number> {
  if (!value) return {};

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as Record<string, unknown>;
      if (parsed && typeof parsed === "object") {
        return Object.fromEntries(
          Object.entries(parsed).map(([key, pricingValue]) => [
            String(key),
            Number(pricingValue ?? 0),
          ]),
        );
      }
    } catch {
      return {};
    }
    return {};
  }

  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, pricingValue]) => [
        String(key),
        Number(pricingValue ?? 0),
      ]),
    );
  }

  return {};
}

function extractSmsPoolRentalId(raw: Record<string, unknown>, fallbackKey: string): string {
  const candidateKeys = ["ID", "id", "rental_id", "rentalId", "rentalID", "code", "slug"];
  for (const key of candidateKeys) {
    const value = raw[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value);
    }
  }
  return String(fallbackKey);
}

function smsPoolUnsupportedRentalDetails({
  country,
  service,
  operation,
  endpoint,
  status,
  responseBody,
}: {
  country?: string;
  service?: string;
  operation: string;
  endpoint: string;
  status?: number;
  responseBody?: string;
}) {
  return {
    provider: "smspool",
    endpoint,
    status,
    country,
    service,
    operation,
    responseMessage: responseBody && responseBody.trim() ? responseBody.trim().slice(0, 2000) : "",
    message:
      "SMSPool does not currently expose a public 1â€“30 day rental tier API. Supported product is temporary OTP numbers via /purchase/sms; monthly rentals remain on Telnyx.",
  };
}

function smsPoolUnsupportedRentalError(input: {
  country?: string;
  service?: string;
  operation: string;
  endpoint: string;
  status?: number;
  responseBody?: string;
}): Error {
  const details = smsPoolUnsupportedRentalDetails(input);
  console.warn("[smspool] unsupported rental product requested", details);
  return new Error(details.message);
}

// â”€â”€ TELNYX: Search â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function searchTelnyxNumbers(
  countryCode: string,
  capabilities: string[] = ["sms"],
): Promise<TelnyxAvailableNumber[]> {
  const params = new URLSearchParams({
    "filter[country_code]": countryCode,
    "filter[limit]": "10",
    // Do NOT filter by phone_number_type â€” "local" only exists in US/CA.
    // European numbers are "national", APAC are "mobile", etc.
    // Telnyx will return whatever is available for the country.
  });
  // Telnyx documents this as the singular deep-object field
  // `filter[features]`. We currently search for one required capability.
  const requiredFeature = capabilities[0];
  if (requiredFeature) {
    params.set("filter[features]", requiredFeature);
  }

  const res = await fetch(`${TELNYX_BASE}/available_phone_numbers?${params}`, {
    headers: telnyxHeaders(),
  });

  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { errors?: Array<{ detail?: string }> };
    throw new Error(err?.errors?.[0]?.detail ?? `Telnyx search failed (${res.status})`);
  }

  const json = (await res.json()) as {
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

// â”€â”€ TELNYX: Purchase â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function purchaseTelnyxNumber(phoneNumber: string): Promise<TelnyxPurchasedNumber> {
  const profileId = process.env.TELNYX_MESSAGING_PROFILE_ID;
  const body: Record<string, string> = { phone_number: phoneNumber };
  if (profileId) body.messaging_profile_id = profileId;

  const res = await fetch(`${TELNYX_BASE}/phone_numbers`, {
    method: "POST",
    headers: telnyxHeaders(),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { errors?: Array<{ detail?: string }> };
    throw new Error(err?.errors?.[0]?.detail ?? `Telnyx purchase failed (${res.status})`);
  }

  const json = (await res.json()) as {
    data: { id: string; phone_number: string; status: string };
  };

  return {
    id: json.data.id,
    phoneNumber: json.data.phone_number,
    status: json.data.status,
  };
}

// â”€â”€ TELNYX: Release â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function releaseTelnyxNumber(telnyxNumberId: string): Promise<void> {
  const res = await fetch(`${TELNYX_BASE}/phone_numbers/${telnyxNumberId}`, {
    method: "DELETE",
    headers: telnyxHeaders(),
  });

  // 404 = already removed, treat as success
  if (!res.ok && res.status !== 404) {
    const err = (await res.json().catch(() => ({}))) as { errors?: Array<{ detail?: string }> };
    throw new Error(err?.errors?.[0]?.detail ?? `Telnyx release failed (${res.status})`);
  }
}

// â”€â”€ TELNYX: Pricing â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function getTelnyxPricing(countryCode: string): Promise<number> {
  try {
    const numbers = await searchTelnyxNumbers(countryCode);
    return numbers[0]?.monthlyCostUsd ?? 1.0;
  } catch {
    return 1.0;
  }
}

// â”€â”€ SMSPOOL: Request temp number â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function requestSMSPoolNumber(
  country: string,
  service: string = "any",
): Promise<SMSPoolNumber> {
  // Build params â€” omit "service" when the user chose "any" (cheapest available).
  // SMSPool does NOT accept "any" as a valid service ID; omitting the param means
  // "give me the cheapest number available in this country."
  const params = new URLSearchParams({ key: smsPoolKey(), country });
  if (service && service !== "any") {
    params.set("service", service);
  }

  // Correct endpoint: /purchase/sms (verified against SMSPool API docs)
  const res = await fetch(`${SMSPOOL_BASE}/purchase/sms?${params}`);

  if (!res.ok) {
    throw new Error(`SMSPool request failed (${res.status})`);
  }

  const json = (await res.json()) as {
    success?: number;
    error?: number;
    message?: string;
    order_id?: string | number; // SMSPool uses order_id (not orderId)
    number?: string; // phone number field is "number" (not phonenumber)
    country?: string;
    service?: string;
    expires_in?: number;
  };

  if (json.error || json.success === 0) {
    throw new Error(
      json.message ??
        "SMSPool number request failed â€” check balance or country/service availability",
    );
  }

  const orderId = String(json.order_id ?? "");
  const phoneNumber = json.number ?? "";

  if (!orderId || !phoneNumber) {
    throw new Error("SMSPool returned invalid response â€” missing order_id or number");
  }

  return { orderId, phoneNumber };
}

// â”€â”€ SMSPOOL: Poll inbox â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * Poll once. Returns the SMS text if received, null if still waiting.
 * Call every ~5 seconds on the client, up to 20 minutes.
 */
export async function pollSMSPoolInbox(orderId: string): Promise<string | null> {
  const params = new URLSearchParams({
    key: smsPoolKey(),
    orderid: orderId,
  });

  try {
    const res = await fetch(`${SMSPOOL_BASE}/sms/check?${params}`);
    if (!res.ok) return null;

    const json = (await res.json()) as {
      sms?: string;
      full_sms?: string;
      // status is numeric: 1=waiting, 2=received/completed, 3=expired/cancelled
      status?: number | string;
      code?: string;
    };

    // Most reliable signal: SMS text present in response
    const text = json.sms ?? json.full_sms;
    if (text && text.trim()) return text;

    return null;
  } catch {
    return null;
  }
}

// â”€â”€ SMSPOOL: Pricing â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function getSMSPoolPrice(country: string, service: string = "any"): Promise<number> {
  const cleanCountry = String(country ?? "").trim();
  if (!cleanCountry) throw new Error("SMSPool country is required for pricing");

  const params = new URLSearchParams({ key: smsPoolKey(), country: cleanCountry });
  const cleanService = String(service ?? "any").trim();
  if (cleanService && cleanService !== "any") params.set("service", cleanService);

  const urls = [
    `${SMSPOOL_BASE}/request/price?${params}`,
    `${SMSPOOL_BASE}/service/price?${params}`,
    `${SMSPOOL_BASE}/request/get_service_price?${params}`,
  ];

  let lastError: Error | null = null;
  for (const url of urls) {
    try {
      const res = await fetch(url);
      if (!res.ok) {
        lastError = new Error(`SMSPool price lookup failed (${res.status})`);
        continue;
      }

      const json = (await res.json()) as Record<string, unknown>;
      const candidates = [
        json.price,
        json.amount,
        json.cost,
        json.total,
        json.value,
        json.data,
        json.result,
        Array.isArray(json.data) ? json.data[0]?.price : undefined,
        Array.isArray(json.result) ? json.result[0]?.price : undefined,
      ];

      const priceValue = candidates.find((value) => {
        if (value === null || value === undefined || value === "") return false;
        const raw =
          typeof value === "object"
            ? ((value as Record<string, unknown>).price ??
              (value as Record<string, unknown>).amount ??
              (value as Record<string, unknown>).cost)
            : value;
        return raw !== null && raw !== undefined && raw !== "";
      });

      const normalized = Number(
        typeof priceValue === "object"
          ? ((priceValue as Record<string, unknown>).price ??
              (priceValue as Record<string, unknown>).amount ??
              (priceValue as Record<string, unknown>).cost ??
              0)
          : priceValue,
      );

      if (Number.isFinite(normalized) && normalized > 0) return normalized;
      lastError = new Error("SMSPool returned an invalid price response");
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("SMSPool price lookup failed");
    }
  }

  throw lastError ?? new Error("SMSPool price lookup failed");
}

export async function getSMSPoolPricing(): Promise<Record<string, number>> {
  try {
    const params = new URLSearchParams({ key: smsPoolKey() });
    const res = await fetch(`${SMSPOOL_BASE}/country/prices?${params}`);
    if (!res.ok) return {};

    const json = (await res.json()) as Array<{
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

// â”€â”€ SMSPOOL: Country + service lists â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function getSMSPoolCountries(): Promise<Array<{ id: string; name: string }>> {
  try {
    const params = new URLSearchParams({ key: smsPoolKey() });
    const res = await fetch(`${SMSPOOL_BASE}/country/retrieve_all?${params}`);
    if (!res.ok) return SMSPOOL_COMMON_COUNTRIES;

    const json = (await res.json()) as Array<{
      ID?: string;
      name?: string;
      short_name?: string;
      id?: string | number;
      shortName?: string;
    }>;
    if (!Array.isArray(json)) return SMSPOOL_COMMON_COUNTRIES;

    return json
      .map((c) => ({
        id: String(c.short_name ?? c.shortName ?? c.ID ?? c.id ?? ""),
        name: String(c.name ?? c.short_name ?? c.shortName ?? c.ID ?? ""),
      }))
      .filter((c) => c.id);
  } catch {
    return SMSPOOL_COMMON_COUNTRIES;
  }
}

export async function getSMSPoolServices(): Promise<SMSPoolService[]> {
  try {
    const params = new URLSearchParams({ key: smsPoolKey() });
    const res = await fetch(`${SMSPOOL_BASE}/service/retrieve_all?${params}`);
    if (!res.ok) return SMSPOOL_COMMON_SERVICES;

    const json = (await res.json()) as Array<{
      ID?: string | number;
      name?: string;
      id?: string | number;
    }>;
    if (!Array.isArray(json)) return SMSPOOL_COMMON_SERVICES;

    return json
      .map((s) => ({
        id: String(s.ID ?? s.id ?? s.name ?? ""),
        name: String(s.name ?? s.ID ?? s.id ?? ""),
      }))
      .filter((s) => s.id);
  } catch {
    return SMSPOOL_COMMON_SERVICES;
  }
}

export async function getSMSPoolRentals(type: 0 | 1 = 0): Promise<SMSPoolRentalTier[]> {
  const endpoint = `${SMSPOOL_BASE}/rental/retrieve_all`;

  const body = new FormData();

  body.append("key", smsPoolKey());
  body.append("type", String(type));

  const response = await fetch(endpoint, {
    method: "POST",
    body,
  });

  const rawText = await response.text();

  let json: {
    success?: number;
    message?: string;
    data?: Array<{
      ID?: number | string;
      name?: string;
      tag?: string;
      region?: string;
      pricing?: Record<string, number | string>;
      priority?: number;
      pool?: number;
      single_service?: string | null;
      single_service_extend?: string | null;
      is_refundable?: number;
      refund_within?: number;
      refund_min_days?: number;
    }>;
  } | null = null;

  try {
    json = rawText ? JSON.parse(rawText) : null;
  } catch {
    json = null;
  }

  console.info("[smspool] getSMSPoolRentals", {
    status: response.status,
    success: json?.success,
    message: json?.message,
    count: Array.isArray(json?.data) ? json.data.length : 0,
  });

  if (!response.ok) {
    throw new Error(json?.message ?? `SMSPool rental retrieval failed (${response.status})`);
  }

  if (!json || json.success !== 1 || !Array.isArray(json.data)) {
    throw new Error(json?.message ?? "SMSPool did not return any rental products.");
  }

  return json.data
    .map((item) => {
      const pricing: Record<string, number> = {};

      for (const [days, rawPrice] of Object.entries(item.pricing ?? {})) {
        const price = Number(rawPrice);

        if (Number.isFinite(price)) {
          pricing[days] = price;
        }
      }

      return {
        rentalId: String(item.ID ?? ""),
        name: item.name ?? "",
        country: item.name ?? "",
        tag: item.tag ?? item.name ?? "",
        region: item.region ?? "",
        type,
        pricing,
        priority: item.priority ?? 0,
        pool: item.pool ?? null,
        singleService: item.single_service ?? null,
        singleServiceExtend: item.single_service_extend ?? null,
        isRefundable: item.is_refundable === 1,
        refundWithin: item.refund_within ?? 0,
        refundMinDays: item.refund_min_days ?? 0,
      };
    })
    .filter((item) => item.rentalId && Object.keys(item.pricing).length > 0) as SMSPoolRentalTier[];
}

// â”€â”€ Shared utilities (re-exported from sms-utils for server callers) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export { extractOTP, detectService } from "@/lib/sms-utils";

// â”€â”€ TELNYX: Send outbound SMS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function sendTelnyxSMS(from: string, to: string, text: string): Promise<string> {
  const profileId = process.env.TELNYX_MESSAGING_PROFILE_ID;
  const res = await fetch(`${TELNYX_BASE}/messages`, {
    method: "POST",
    headers: telnyxHeaders(),
    body: JSON.stringify({
      from,
      to,
      text,
      ...(profileId && { messaging_profile_id: profileId }),
    }),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { errors?: Array<{ detail?: string }> };
    throw new Error(err?.errors?.[0]?.detail ?? `Telnyx send SMS failed (${res.status})`);
  }
  const json = (await res.json()) as { data: { id: string } };
  return json.data.id;
}

// â”€â”€ TELNYX: Configure call forwarding on a number â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function configureTelnyxCallForward(
  telnyxNumberId: string,
  forwardTo: string | null,
): Promise<void> {
  // Call forwarding via Telnyx Call Control requires the number to be attached
  // to a Call Control Application whose webhook URL is /api/public/webhooks/telnyx-voice.
  // We store the forward destination in our DB; the webhook handler does the actual transfer.
  // This call just updates the Telnyx voice settings to enable/disable call-and-transfer.
  const res = await fetch(`${TELNYX_BASE}/phone_numbers/${telnyxNumberId}`, {
    method: "PATCH",
    headers: telnyxHeaders(),
    body: JSON.stringify({
      call_forward_enable: !!forwardTo,
    }),
  });
  // Ignore 404 / 422 â€” number may not be a Call Control number
  if (!res.ok && res.status !== 404 && res.status !== 422) {
    const err = (await res.json().catch(() => ({}))) as { errors?: Array<{ detail?: string }> };
    throw new Error(
      err?.errors?.[0]?.detail ?? `Telnyx call forward config failed (${res.status})`,
    );
  }
}

// â”€â”€ SMSPOOL: Account balance â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function getSMSPoolBalance(): Promise<number> {
  try {
    const params = new URLSearchParams({ key: smsPoolKey() });
    const res = await fetch(`${SMSPOOL_BASE}/account/balance?${params}`);
    if (!res.ok) return 0;
    const json = (await res.json()) as { balance?: string | number };
    return parseFloat(String(json.balance ?? "0"));
  } catch {
    return 0;
  }
}

// â”€â”€ SMSPOOL: Cancel active order â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function cancelSMSPoolOrder(orderId: string): Promise<void> {
  const params = new URLSearchParams({ key: smsPoolKey(), orderid: orderId });
  const res = await fetch(`${SMSPOOL_BASE}/sms/cancel?${params}`);
  if (!res.ok) throw new Error(`SMSPool cancel failed (${res.status})`);
  const json = (await res.json()) as { success?: number; message?: string };
  if (json.success !== 1) throw new Error(json.message ?? "SMSPool cancel failed");
}

// â”€â”€ SMSPOOL: Resend SMS request â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function resendSMSPoolSMS(orderId: string): Promise<void> {
  const params = new URLSearchParams({ key: smsPoolKey(), orderid: orderId });
  const res = await fetch(`${SMSPOOL_BASE}/sms/resend?${params}`);
  if (!res.ok) throw new Error(`SMSPool resend failed (${res.status})`);
  const json = (await res.json()) as { success?: number; message?: string };
  if (json.success !== 1) throw new Error(json.message ?? "SMSPool resend failed");
}

// â”€â”€ SMSPOOL: Order history â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface SMSPoolOrder {
  order_id: string;
  number: string;
  country?: string;
  service?: string;
  /** numeric: 1=waiting, 2=received, 3=expired/cancelled */
  status: number;
  sms?: string;
}

export async function getSMSPoolOrderHistory(): Promise<SMSPoolOrder[]> {
  try {
    const params = new URLSearchParams({ key: smsPoolKey() });
    const res = await fetch(`${SMSPOOL_BASE}/sms/history?${params}`);
    if (!res.ok) return [];
    const json = await res.json();
    return Array.isArray(json) ? (json as SMSPoolOrder[]) : [];
  } catch {
    return [];
  }
}

// â”€â”€ SMSPOOL: Purchase rental number (1-30 day) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface SMSPoolRentalNumber {
  orderId: string;
  phoneNumber: string;
  expiresIn: number; // seconds
}

export async function purchaseSMSPoolRental(
  rentalId: string,
  days: number,
  serviceId?: string,
): Promise<SMSPoolRentalNumber> {
  const endpoint = `${SMSPOOL_BASE}/purchase/rental`;
  const body = new FormData();
  body.append("key", smsPoolKey());
  body.append("id", rentalId);
  body.append("days", String(days));
  if (serviceId && serviceId !== "any") {
    body.append("service_id", serviceId);
  }
  body.append("create_token", "0");

  const res = await fetch(endpoint, {
    method: "POST",
    body,
  });

  const json = (await res.json().catch(() => null)) as {
    success?: number;
    message?: string;
    order_id?: string | number;
    orderId?: string | number;
    rental_code?: string | number;
    rentalCode?: string | number;
    id?: string | number;
    number?: string;
    phone_number?: string;
    phonenumber?: string;
    expires_in?: number | string;
    expiresIn?: number | string;
    expires_at?: string | number;
    expiresAt?: string | number;
  } | null;

  if (!res.ok || !json || json.success !== 1) {
    throw new Error(json?.message ?? `SMSPool rental purchase failed (${res.status})`);
  }

  const orderId = String(
    json.rental_code ?? json.rentalCode ?? json.order_id ?? json.orderId ?? json.id ?? "",
  );
  const phoneNumber = String(json.number ?? json.phone_number ?? json.phonenumber ?? "");
  const expiresIn = Number(
    json.expires_in ?? json.expiresIn ?? json.expires_at ?? json.expiresAt ?? days * 24 * 60 * 60,
  );

  if (!orderId || !phoneNumber) {
    throw new Error("SMSPool rental purchase response is missing required rental details");
  }

  return { orderId, phoneNumber, expiresIn };
}

export async function purchaseSMSPoolRentalNumber(
  country: string,
  service: string = "any",
  days: number = 7,
): Promise<SMSPoolRentalNumber> {
  const params = new URLSearchParams({ key: smsPoolKey(), country, days: String(days) });
  if (service && service !== "any") params.set("service", service);

  const urls = [
    `${SMSPOOL_BASE}/purchase/number?${params}`,
    `${SMSPOOL_BASE}/purchase/rental?${params}`,
    `${SMSPOOL_BASE}/rental/purchase?${params}`,
  ];

  for (const url of urls) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const json = (await res.json()) as {
        success?: number;
        error?: number;
        message?: string;
        order_id?: string | number;
        orderId?: string | number;
        number?: string;
        phonenumber?: string;
        phone_number?: string;
        expires_in?: number;
        expiresIn?: number;
      };

      if (json.error || json.success === 0) {
        throw new Error(
          json.message ?? "SMSPool rental failed â€” check country/service availability",
        );
      }

      const orderId = String(json.order_id ?? json.orderId ?? "");
      const phoneNumber = json.number ?? json.phonenumber ?? json.phone_number ?? "";
      const expiresIn = Number(json.expires_in ?? json.expiresIn ?? days * 24 * 3600);

      if (orderId && phoneNumber) return { orderId, phoneNumber, expiresIn };
    } catch {
      // fallback to the next endpoint attempt
    }
  }

  throw new Error("SMSPool rental purchase failed â€” no valid response from the provider");
}

// â”€â”€ Fallback lists â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
