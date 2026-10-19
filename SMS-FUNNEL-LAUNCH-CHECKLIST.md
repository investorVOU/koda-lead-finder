# SMS Funnel Launch Checklist

This is the implementation and launch reference for the separate KodarAI SMS / virtual-number funnel. It is designed to run beside the main KodarAI website without removing or changing the existing numbers pages, navigation, or flows.

## What is already prepared

- The regular KodarAI app remains the default website.
- A standalone SMS landing page is available at `/sms` for preview.
- A second Render service can use `VITE_SMS_FUNNEL_MODE=true` to make the SMS landing page its homepage.
- In SMS funnel mode, signed-in customers can go directly to `/numbers` without needing the KodarAI Starter plan.
- Sign-up and login can return a customer to `/numbers` using `?next=numbers`.
- The existing number purchase flow remains in the main KodarAI app too.
- Long dialogs, including the temporary-number purchase dialog, now scroll correctly on mobile.

## KodarAI Starter-plan price

The current Starter plan is set to **₦2,000**.

Why this is the better first test than ₦1,000 or ₦2,500:

- ₦2,000 means 500 payments equals ₦1,000,000 gross revenue.
- It is still a low enough amount to test whether visitors trust the product and see the value.
- Do not change price only based on registrations. Compare paid conversions and revenue per landing-page visitor for each price/creative before increasing it again.

## Deploy the separate SMS site on Render

1. Create a new Render account and a new Web Service from this repository.
2. Deploy the branch `feat/visitor-telegram`.
3. Use these build settings:
   - Build command: `npm install && npm run build`
   - Start command: `npm run start`
4. Copy the server-side environment variables from the existing working Render service.
5. On the new service, set:
   - `APP_URL=https://sms.kodarai.xyz`
   - `VITE_SMS_FUNNEL_MODE=true`
6. Do not expose database keys, service-role keys, payment secrets, Telnyx secrets, or other server keys with a `VITE_` prefix.

The main KodarAI Render service should keep `VITE_SMS_FUNNEL_MODE=false` (or leave it unset).

## Connect `sms.kodarai.xyz` in Namecheap

1. In the new Render service, add the custom domain `sms.kodarai.xyz`.
2. Render will show the DNS target to use.
3. In Namecheap Advanced DNS, add a **CNAME Record**:
   - Host: `sms`
   - Value: the Render target shown for the new service
4. Save it and wait for Render to verify SSL and the domain.

Do not change the `@` or `www` DNS records. They continue to serve the main KodarAI website.

## Supabase authentication settings

Both Render services use the same Supabase project and the same users. In Supabase Auth URL Configuration:

- Add `https://sms.kodarai.xyz/numbers` to Redirect URLs.
- Add `https://sms.kodarai.xyz/dashboard` to Redirect URLs.
- Add `https://sms.kodarai.xyz/reset-password` to Redirect URLs.
- Keep the existing KodarAI URLs; do not replace them.

This allows authentication links and post-login redirects to work on the SMS subdomain.

## SMS-provider webhook safety

Keep the inbound SMS/webhook base URL pointed at the existing working KodarAI service unless the provider supports a deliberate migration.

Do not point the number-provider webhook at the new SMS marketing Render service just because it shares the same database. The existing app already handles live incoming message delivery; changing the webhook can break delivery.

## Meta creative and landing-page guardrails

Use clear product language such as:

- “Virtual numbers, in one simple dashboard”
- “Choose a number. Buy it. Manage messages.”
- “A clean place to manage your virtual-number messages”

Avoid ad or landing-page copy that implies:

- guaranteed income or a money-making opportunity;
- bypassing verification, account restrictions, or platform rules;
- access to OTPs or codes for third-party accounts;
- affiliations with WhatsApp, Telegram, Meta, banks, or any other third-party platform.

Show the actual number price, recurring charges, and what the customer receives before checkout. Keep the creative focused on the product experience, not unrealistic outcomes.

## Pre-launch checks

- Open `https://sms.kodarai.xyz` on a phone after DNS is live.
- Test sign-up from an ad-style URL and confirm it lands on `/numbers`.
- Test login with `?next=numbers` and confirm it returns to `/numbers`.
- Buy a test number only if the provider/test account makes that safe and affordable.
- Confirm purchase status, number display, and message inbox work.
- Confirm the main KodarAI domain, existing numbers page, and inbound SMS delivery still work.
- Start ads with a small budget and compare click-through rate, sign-up completion, checkout starts, successful purchases, and cost per purchase by creative.
