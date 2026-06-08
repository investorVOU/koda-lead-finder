export interface NumberCountry {
  code: string;
  name: string;
  flag: string;
  usd: number;
  ngn: number;
}

export const NUMBER_COUNTRIES: NumberCountry[] = [
  { code: "US", name: "United States", flag: "🇺🇸", usd: 3.99, ngn: 6500 },
  { code: "GB", name: "United Kingdom", flag: "🇬🇧", usd: 3.99, ngn: 6500 },
  { code: "CA", name: "Canada",         flag: "🇨🇦", usd: 3.99, ngn: 6500 },
  { code: "AU", name: "Australia",      flag: "🇦🇺", usd: 4.99, ngn: 8000 },
  { code: "DE", name: "Germany",        flag: "🇩🇪", usd: 4.99, ngn: 8000 },
  { code: "FR", name: "France",         flag: "🇫🇷", usd: 4.99, ngn: 8000 },
];

export type NumberStatus = "pending_payment" | "active" | "released";

export interface VirtualNumber {
  id: string;
  user_id: string;
  twilio_sid: string;
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
  twilio_sid: string | null;
  direction: "inbound" | "outbound";
  from_number: string;
  to_number: string;
  body: string;
  status: string;
  received_at: string;
}
