export interface NumberCountry {
  code: string;
  name: string;
  flag: string;
  usd: number;
  ngn: number;
}

export const NUMBER_COUNTRIES: NumberCountry[] = [
  { code: "US", name: "United States", flag: "🇺🇸", usd: 1.00, ngn: 1500 },
  { code: "GB", name: "United Kingdom", flag: "🇬🇧", usd: 1.00, ngn: 1500 },
  { code: "CA", name: "Canada",         flag: "🇨🇦", usd: 1.00, ngn: 1500 },
  { code: "AU", name: "Australia",      flag: "🇦🇺", usd: 2.00, ngn: 3000 },
  { code: "DE", name: "Germany",        flag: "🇩🇪", usd: 2.00, ngn: 3000 },
  { code: "FR", name: "France",         flag: "🇫🇷", usd: 2.00, ngn: 3000 },
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
