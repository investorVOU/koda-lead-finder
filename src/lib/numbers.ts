export interface NumberCountry {
  code: string;
  name: string;
  flag: string;
  usd: number;
  ngn: number;
}

// All Telnyx-supported countries for rental (local) numbers with SMS.
// NGN ≈ USD × 1600 (standard reference rate; actual charge uses live fxRate in UI).
export const NUMBER_COUNTRIES: NumberCountry[] = [
  // ── Americas ──────────────────────────────────────────────────────────────
  { code: "US", name: "United States",   flag: "🇺🇸", usd: 1.00, ngn: 1600 },
  { code: "CA", name: "Canada",          flag: "🇨🇦", usd: 1.00, ngn: 1600 },
  { code: "PR", name: "Puerto Rico",     flag: "🇵🇷", usd: 1.00, ngn: 1600 },
  { code: "MX", name: "Mexico",          flag: "🇲🇽", usd: 2.00, ngn: 3200 },
  { code: "BR", name: "Brazil",          flag: "🇧🇷", usd: 2.00, ngn: 3200 },
  { code: "CO", name: "Colombia",        flag: "🇨🇴", usd: 2.00, ngn: 3200 },
  { code: "CL", name: "Chile",           flag: "🇨🇱", usd: 2.00, ngn: 3200 },
  { code: "PE", name: "Peru",            flag: "🇵🇪", usd: 2.00, ngn: 3200 },
  { code: "CR", name: "Costa Rica",      flag: "🇨🇷", usd: 2.00, ngn: 3200 },
  { code: "GT", name: "Guatemala",       flag: "🇬🇹", usd: 2.00, ngn: 3200 },
  { code: "PA", name: "Panama",          flag: "🇵🇦", usd: 2.00, ngn: 3200 },
  { code: "EC", name: "Ecuador",         flag: "🇪🇨", usd: 2.00, ngn: 3200 },
  { code: "SV", name: "El Salvador",     flag: "🇸🇻", usd: 2.00, ngn: 3200 },

  // ── Western Europe ────────────────────────────────────────────────────────
  { code: "GB", name: "United Kingdom",  flag: "🇬🇧", usd: 1.00, ngn: 1600 },
  { code: "DE", name: "Germany",         flag: "🇩🇪", usd: 1.50, ngn: 2400 },
  { code: "NL", name: "Netherlands",     flag: "🇳🇱", usd: 1.50, ngn: 2400 },
  { code: "AT", name: "Austria",         flag: "🇦🇹", usd: 3.00, ngn: 4800 },
  { code: "BE", name: "Belgium",         flag: "🇧🇪", usd: 3.00, ngn: 4800 },
  { code: "CH", name: "Switzerland",     flag: "🇨🇭", usd: 3.00, ngn: 4800 },
  { code: "FR", name: "France",          flag: "🇫🇷", usd: 3.00, ngn: 4800 },
  { code: "IE", name: "Ireland",         flag: "🇮🇪", usd: 3.00, ngn: 4800 },
  { code: "IT", name: "Italy",           flag: "🇮🇹", usd: 3.00, ngn: 4800 },
  { code: "LU", name: "Luxembourg",      flag: "🇱🇺", usd: 3.00, ngn: 4800 },
  { code: "PT", name: "Portugal",        flag: "🇵🇹", usd: 3.00, ngn: 4800 },
  { code: "ES", name: "Spain",           flag: "🇪🇸", usd: 3.00, ngn: 4800 },

  // ── Northern Europe ───────────────────────────────────────────────────────
  { code: "SE", name: "Sweden",          flag: "🇸🇪", usd: 1.50, ngn: 2400 },
  { code: "NO", name: "Norway",          flag: "🇳🇴", usd: 1.50, ngn: 2400 },
  { code: "DK", name: "Denmark",         flag: "🇩🇰", usd: 1.50, ngn: 2400 },
  { code: "FI", name: "Finland",         flag: "🇫🇮", usd: 3.00, ngn: 4800 },
  { code: "EE", name: "Estonia",         flag: "🇪🇪", usd: 2.00, ngn: 3200 },
  { code: "LV", name: "Latvia",          flag: "🇱🇻", usd: 2.00, ngn: 3200 },
  { code: "LT", name: "Lithuania",       flag: "🇱🇹", usd: 2.00, ngn: 3200 },

  // ── Eastern Europe ────────────────────────────────────────────────────────
  { code: "PL", name: "Poland",          flag: "🇵🇱", usd: 1.50, ngn: 2400 },
  { code: "CZ", name: "Czech Republic",  flag: "🇨🇿", usd: 1.50, ngn: 2400 },
  { code: "SK", name: "Slovakia",        flag: "🇸🇰", usd: 1.50, ngn: 2400 },
  { code: "HU", name: "Hungary",         flag: "🇭🇺", usd: 1.50, ngn: 2400 },
  { code: "RO", name: "Romania",         flag: "🇷🇴", usd: 1.50, ngn: 2400 },
  { code: "BG", name: "Bulgaria",        flag: "🇧🇬", usd: 1.50, ngn: 2400 },
  { code: "GR", name: "Greece",          flag: "🇬🇷", usd: 2.00, ngn: 3200 },
  { code: "HR", name: "Croatia",         flag: "🇭🇷", usd: 2.00, ngn: 3200 },
  { code: "SI", name: "Slovenia",        flag: "🇸🇮", usd: 2.00, ngn: 3200 },
  { code: "CY", name: "Cyprus",          flag: "🇨🇾", usd: 2.00, ngn: 3200 },
  { code: "MT", name: "Malta",           flag: "🇲🇹", usd: 2.00, ngn: 3200 },

  // ── Asia-Pacific ──────────────────────────────────────────────────────────
  { code: "AU", name: "Australia",       flag: "🇦🇺", usd: 1.50, ngn: 2400 },
  { code: "NZ", name: "New Zealand",     flag: "🇳🇿", usd: 1.50, ngn: 2400 },
  { code: "JP", name: "Japan",           flag: "🇯🇵", usd: 5.00, ngn: 8000 },
  { code: "SG", name: "Singapore",       flag: "🇸🇬", usd: 5.00, ngn: 8000 },
  { code: "HK", name: "Hong Kong",       flag: "🇭🇰", usd: 5.00, ngn: 8000 },
  { code: "MY", name: "Malaysia",        flag: "🇲🇾", usd: 3.00, ngn: 4800 },
  { code: "TH", name: "Thailand",        flag: "🇹🇭", usd: 3.00, ngn: 4800 },

  // ── Middle East ───────────────────────────────────────────────────────────
  { code: "IL", name: "Israel",          flag: "🇮🇱", usd: 3.00, ngn: 4800 },

  // ── Africa ────────────────────────────────────────────────────────────────
  { code: "ZA", name: "South Africa",    flag: "🇿🇦", usd: 2.00, ngn: 3200 },
];

export type NumberProvider = "telnyx" | "smspool";
export type NumberStatus   = "pending_payment" | "active" | "released" | "expired";

export interface VirtualNumber {
  id: string;
  user_id: string;
  /** Legacy Twilio SID — kept for DB compat; may be null for new records */
  twilio_sid: string | null;
  /** Provider-specific ID: Telnyx UUID or SMSPool orderId */
  provider_sid: string | null;
  provider: NumberProvider;
  phone_number: string;
  friendly_name: string | null;
  country_code: string;
  number_type: string;
  status: NumberStatus;
  monthly_usd: number;
  monthly_ngn: number;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SmsMessage {
  id: string;
  number_id: string;
  user_id: string;
  /** Legacy Twilio SID — may be null for Telnyx/SMSPool messages */
  twilio_sid: string | null;
  provider_sid: string | null;
  provider: string;
  direction: "inbound" | "outbound";
  from_number: string;
  to_number: string;
  body: string;
  status: string;
  received_at: string;
}

// SMSPool temp number pricing (approx USD, varies by country/service)
export const SMSPOOL_APPROX_PRICE_NGN = 150; // ~$0.10 USD
export const SMSPOOL_APPROX_PRICE_USD = 0.10;
