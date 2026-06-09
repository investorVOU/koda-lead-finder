# KodaRai — Virtual Phone Numbers Feature (Master Cursor Prompt)

-----

Add a complete “Virtual Phone Numbers” feature to KodaRai — my existing Next.js (App Router) + Supabase SaaS app at kodarai.xyz. Do not scaffold a new project. Slot everything into the existing codebase. Use TypeScript throughout with comments on non-obvious logic.

-----

## Stack Context

- Framework: Next.js App Router
- Database + Auth + Realtime: Supabase
- Styling: Tailwind CSS (dark-friendly, green accents)
- Payments: Paystack (Nigerian users) + Stripe (global)
- Email: Resend
- Existing subscription tiers: Free, Pro, Max

-----

## Provider Strategy

- **Twilio** → long-term rental numbers (voice + SMS, persistent inbox)
- **SMSPool** → cheap one-time temp numbers (verification use case)
- Abstract both behind a single `/lib/services/phone-numbers.ts` service layer so providers are swappable without touching the UI
- Never mix their pricing or display — they are two distinct product types

-----

## Environment Variables Needed

```env
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_WEBHOOK_BASE_URL=https://kodarai.xyz

SMSPOOL_API_KEY=

NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

RESEND_API_KEY=
PAYSTACK_SECRET_KEY=
STRIPE_SECRET_KEY=

EXCHANGE_RATE_API_URL=https://open.er-api.com/v6/latest/USD
PRICING_MARKUP_DEFAULT=1.65
```

-----

## 1. Supabase Database Schema

Create the following tables with RLS policies tied to `auth.uid()`:

```sql
-- User wallet balances (add column to existing profiles table)
ALTER TABLE profiles ADD COLUMN wallet_balance NUMERIC DEFAULT 0;

-- Virtual numbers owned by users
CREATE TABLE virtual_numbers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  number TEXT NOT NULL UNIQUE,
  country_code TEXT NOT NULL,         -- e.g. 'US', 'GB', 'NG'
  provider TEXT NOT NULL,             -- 'twilio' | 'smspool'
  type TEXT NOT NULL,                 -- 'rental' | 'temporary'
  capabilities TEXT[] DEFAULT '{}',  -- ['sms', 'voice', 'mms']
  status TEXT DEFAULT 'active',       -- 'active' | 'expired' | 'released'
  reputation_score INT DEFAULT 100,   -- 0-100, auto-updated
  quality_badge TEXT DEFAULT 'standard', -- 'clean' | 'standard' | 'limited'
  forwarding_type TEXT,               -- 'email' | 'whatsapp' | 'telegram' | null
  forwarding_destination TEXT,        -- email address, WA number, or TG chat ID
  auto_renew BOOLEAN DEFAULT false,
  purchased_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  provider_sid TEXT,                  -- Twilio SID or SMSPool order ID
  created_at TIMESTAMPTZ DEFAULT now()
);

-- SMS inbox messages
CREATE TABLE sms_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  number_id UUID REFERENCES virtual_numbers(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  sender TEXT NOT NULL,
  body TEXT NOT NULL,
  otp_detected TEXT,                  -- extracted OTP if found
  service_detected TEXT,              -- e.g. 'WhatsApp', 'Instagram'
  forwarded BOOLEAN DEFAULT false,
  received_at TIMESTAMPTZ DEFAULT now()
);

-- Wallet transactions log
CREATE TABLE number_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,                 -- 'topup' | 'purchase' | 'renewal' | 'refund'
  amount NUMERIC NOT NULL,            -- in NGN
  provider TEXT,
  number TEXT,
  balance_before NUMERIC,
  balance_after NUMERIC,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- FX rate cache
CREATE TABLE fx_rates (
  currency_pair TEXT PRIMARY KEY,     -- e.g. 'USD_NGN'
  rate NUMERIC NOT NULL,
  fetched_at TIMESTAMPTZ DEFAULT now()
);

-- Admin pricing config
CREATE TABLE pricing_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,             -- 'twilio' | 'smspool'
  markup_multiplier NUMERIC DEFAULT 1.65,
  fx_cache_ttl_minutes INT DEFAULT 60,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Team/shared number access
CREATE TABLE number_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  number_id UUID REFERENCES virtual_numbers(id) ON DELETE CASCADE,
  owner_id UUID REFERENCES auth.users(id),
  member_id UUID REFERENCES auth.users(id),
  role TEXT DEFAULT 'viewer',         -- 'owner' | 'viewer'
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS Policies
ALTER TABLE virtual_numbers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own numbers" ON virtual_numbers FOR ALL USING (auth.uid() = user_id);

ALTER TABLE sms_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own messages" ON sms_messages FOR ALL USING (auth.uid() = user_id);

ALTER TABLE number_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own transactions" ON number_transactions FOR ALL USING (auth.uid() = user_id);

-- Enable Supabase Realtime on sms_messages
ALTER PUBLICATION supabase_realtime ADD TABLE sms_messages;
```

-----

## 2. Service Layer — `/lib/services/phone-numbers.ts`

Build a unified service with these exported functions:

```ts
// Twilio functions
searchTwilioNumbers(country: string, capabilities: string[])
purchaseTwilioNumber(phoneNumber: string, userId: string)
releaseTwilioNumber(providerSid: string)
getTwilioPricing(countryCode: string): Promise<{ monthly_rental_price: number }>

// SMSPool functions
searchSMSPoolNumbers(country: string, service: string)
purchaseSMSPoolNumber(countryId: string, serviceId: string, userId: string)
getSMSPoolPricing(): Promise<Record<string, number>>

// Shared
getNumberReputation(phoneNumber: string): Promise<{ score: number, badge: string }>
extractOTP(messageBody: string): string | null
detectService(senderNumber: string): string | null
forwardSMS(numberId: string, message: string): Promise<void>
```

For `getNumberReputation`: use Twilio Lookup API to check carrier info and flag VoIP/known-burned ranges. Score starts at 100, deducted for VoIP detection, repeated verification failures, or age < 30 days.

-----

## 3. Dynamic Pricing Engine — `/lib/services/pricing.ts`

```ts
// Fetch and cache USD/NGN rate
getFXRate(): Promise<{ rate: number, source: 'live' | 'cached', fetched_at: string }>
// Check Supabase fx_rates first; if older than 60 mins, re-fetch from open.er-api.com
// If fetch fails, fall back to last cached rate and set source: 'stale'

// Calculate final NGN price
calculateNGNPrice(usdPrice: number, markup?: number): Promise<number>
// Formula: usdPrice × FX rate × markup_multiplier (from pricing_config table)

// Get markup for provider from pricing_config table
getMarkup(provider: 'twilio' | 'smspool'): Promise<number>
```

Price display format: show ₦X,XXX prominently + small “~$X.XX USD” label underneath.

-----

## 4. API Routes

### `GET /api/numbers`

- Return all active virtual_numbers for the authenticated user
- Include sms_messages count per number

### `POST /api/numbers/buy`

Body: `{ provider, countryCode, phoneNumber, type, providerSid }`

- Check user wallet_balance is sufficient
- Deduct balance, log to number_transactions
- Call purchaseTwilioNumber or purchaseSMSPoolNumber
- Insert into virtual_numbers
- Set Twilio webhook to `{TWILIO_WEBHOOK_BASE_URL}/api/webhooks/sms-incoming`

### `DELETE /api/numbers/[id]`

- Release number from provider
- Mark status = ‘released’ in DB
- Partial refund if > 20 days remaining on rental (pro-rated)

### `GET /api/numbers/[id]/messages`

- Paginated SMS inbox for a number (50 per page)

### `GET /api/pricing/fx-rate`

- Return current USD/NGN rate (live or cached)

### `GET /api/pricing/numbers`

Query: `?country=US&provider=twilio`

- Fetch live pricing from Twilio Pricing API or SMSPool prices endpoint
- Apply markup and FX conversion
- Return array of { number, capabilities, usd_price, ngn_price, type }

### `POST /api/wallet/topup`

Body: `{ amount_ngn, gateway: 'paystack' | 'stripe' }`

- Initialize Paystack or Stripe payment
- On success callback: credit wallet_balance, log transaction

### `POST /api/webhooks/sms-incoming`

- Validate Twilio signature (use `twilio.validateRequest()`)
- Parse: To, From, Body
- Look up virtual_numbers by number (To field)
- Run `extractOTP(Body)` and `detectService(From)`
- Insert into sms_messages
- If forwarding configured: call `forwardSMS()`
- Return TwiML 200 response

### `POST /api/cron/expire-numbers`

- Protected by a secret header `x-cron-secret`
- Find all rental numbers where expires_at < now() and status = ‘active’
- If auto_renew = true and wallet_balance sufficient: renew + deduct + log
- If auto_renew = false or insufficient balance: release from Twilio + mark expired
- Send expiry email via Resend for any released numbers
- Register this as a Vercel Cron Job running daily at midnight

-----

## 5. Dashboard Pages

### `/dashboard/numbers` — Numbers Dashboard

- Header: “Your Phone Numbers” + “Buy New Number” button (green)
- Grid of number cards, each showing:
  - Phone number (formatted)
  - Country flag + name
  - Type badge: “Rental” or “Temporary”
  - Quality badge: “✓ Verified Clean” / “Standard” / “⚠ Limited”
  - Capabilities icons: SMS / Voice / MMS
  - Expiry countdown (e.g. “Expires in 12 days”) or “Active” for temp
  - Unread SMS count badge
  - Actions: View Inbox / Manage / Release
- Empty state: illustration + “You have no active numbers. Buy your first one.”
- Wallet balance shown in top right corner of page

### `/dashboard/numbers/buy` — Buy Number Flow

Step 1 — Select Type:

- Two large cards: “Temporary Number” (for one-time verifications) and “Rental Number” (persistent, monthly)
- Temporary: show SMSPool pricing, ~₦150–₦800 one-time, expires after first SMS
- Rental: show Twilio pricing, ₦2,000–₦8,000/month depending on country

Step 2 — Select Country:

- Searchable dropdown with flag emojis
- Countries: US, UK, Canada, Australia, Germany, France, Nigeria, Ghana, South Africa
- On select: fetch live prices from `/api/pricing/numbers`
- Show loading skeleton while fetching

Step 3 — Select Capabilities (Rental only):

- Checkboxes: SMS, Voice, MMS
- Price updates live as capabilities are toggled

Step 4 — Choose Number:

- List of available numbers from provider (5–10 shown)
- Each row: number, capabilities, NGN price, ~USD price, “Select” button
- Refresh list button

Step 5 — Confirm & Buy:

- Summary card: number, type, country, price, wallet balance after purchase
- If insufficient balance: show “Top Up Wallet” CTA instead of Buy button
- Buy button deducts from wallet and provisions number

### `/dashboard/numbers/[id]/inbox` — SMS Inbox

- Header: phone number + country + status badge
- Forwarding settings panel (collapsible): toggle email/WhatsApp/Telegram forwarding
- Real-time message feed (Supabase realtime subscription on sms_messages)
- Each message card:
  - Sender number + detected service (e.g. “WhatsApp” with logo)
  - Message body
  - If OTP detected: large highlighted OTP display + one-tap copy button (⌘ Copy)
  - Timestamp (relative: “2 mins ago”)
- Empty state: “Waiting for messages… Your number is active and ready.”
- Mini stats bar at top: X messages total, last active Y, detected services

### `/dashboard/numbers/[id]/manage` — Number Settings

- Auto-renewal toggle (rental only)
- Forwarding configuration (email input / WhatsApp number / Telegram chat ID)
- Share number with team (Max tier only) — invite by email
- Danger zone: Release Number (with confirmation modal)

### `/dashboard/wallet` — Wallet Page

- Current balance (large display)
- Top up form: amount selector (₦1,000 / ₦2,500 / ₦5,000 / custom)
- Gateway selector: Paystack (🇳🇬) / Stripe (🌍)
- Transaction history table: type, amount, number, date

-----

## 6. Subscription Gating

```ts
// Apply to all number purchase flows
Free tier:   → paywall modal, cannot buy any numbers
Pro tier:    → 10% discount on all purchases, 2 free temp numbers/month
Max tier:    → 20% discount, 5 free temp numbers/month, team sharing enabled
```

Track free monthly allocations in a `monthly_allocations` table reset on billing cycle.

-----

## 7. OTP Auto-Extractor Logic

```ts
function extractOTP(body: string): string | null {
  // Match 4–8 digit codes, common OTP patterns
  const patterns = [
    /\b(\d{4,8})\b/,
    /code[:\s]+(\d{4,8})/i,
    /OTP[:\s]+(\d{4,8})/i,
    /verification code[:\s]+(\d{4,8})/i,
    /(?:is|:)\s*(\d{4,8})/i,
  ];
  for (const pattern of patterns) {
    const match = body.match(pattern);
    if (match) return match[1];
  }
  return null;
}
```

-----

## 8. Service Detection Logic

```ts
// Known sender numbers for popular services
const SERVICE_SENDERS: Record<string, string> = {
  '+14155238886': 'WhatsApp',
  '+16505551234': 'Instagram',
  '+12025551234': 'Facebook',
  '+18005551234': 'Google',
  // Add more as discovered
};

function detectService(sender: string): string | null {
  return SERVICE_SENDERS[sender] ?? null;
}
```

-----

## 9. Number Health / Reputation Scoring

On `purchaseTwilioNumber`, after provisioning:

- Call Twilio Lookup API on the number
- If `line_type` is `voip`: deduct 20 points from reputation_score, set badge = ‘limited’
- If `line_type` is `mobile` or `local`: badge = ‘clean’, score = 100
- Store result in virtual_numbers
- If score < 50: do not sell the number, provision a different one

-----

## 10. Admin Pricing Panel — `/dashboard/admin/pricing`

Only accessible to users with `role = 'admin'` in profiles table.

- Table showing current markup multipliers per provider
- Editable inline — save triggers PATCH to `/api/admin/pricing`
- “Refresh FX Rate Now” button — triggers immediate re-fetch and updates fx_rates
- Current USD/NGN rate display with last fetched timestamp
- Read-only transaction volume summary: total revenue this month, numbers sold

-----

## Output Order

1. Supabase SQL schema (above)
1. `/lib/services/phone-numbers.ts`
1. `/lib/services/pricing.ts`
1. All API routes
1. `/dashboard/numbers` page
1. `/dashboard/numbers/buy` page
1. `/dashboard/numbers/[id]/inbox` page
1. `/dashboard/numbers/[id]/manage` page
1. `/dashboard/wallet` page
1. `/dashboard/admin/pricing` page
1. Vercel cron job config (`vercel.json` cron entry)
1. All environment variables

-----

## Notes

- All monetary values stored in NGN (Naira) in the database
- All provider API calls happen server-side only — never expose API keys to client
- Validate Twilio webhook signatures on every incoming webhook
- Use Supabase service role key only in server-side routes, never in client
- Skeleton loaders on all data-fetching pages
- Mobile responsive — most users will check their SMS inbox on phone