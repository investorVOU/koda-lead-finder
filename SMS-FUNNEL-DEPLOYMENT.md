# SMS funnel deployment (`sms.kodarai.xyz`)

This creates a separate Render deployment for paid virtual-number traffic. It does not replace the existing KodarAI deployment or its Numbers navigation.

## New Render service

1. In the new Render account, create a **Web Service** from this repository and deploy the `feat/visitor-telegram` branch.
2. Use the same build and start commands as the existing app:
   - Build: `npm install && npm run build`
   - Start: `npm run start`
3. Copy the existing service's required environment variables into this new service. Keep all secret values server-side; never add `SUPABASE_SERVICE_ROLE_KEY`, Paystack, Telnyx, or SMSPool keys to variables beginning with `VITE_`.
4. Set these values on the new service:

```text
APP_URL=https://sms.kodarai.xyz
VITE_SMS_FUNNEL_MODE=true
```

`VITE_SMS_FUNNEL_MODE=true` makes the new service's `/` route show the standalone SMS campaign landing page. The normal KodarAI Render service should leave this unset or `false`.

## Domain and DNS

1. In the new Render service, add `sms.kodarai.xyz` under **Settings → Custom Domains**.
2. Render displays a target such as `your-service.onrender.com`.
3. In Namecheap → `kodarai.xyz` → **Advanced DNS**, add one record:

| Type | Host | Value |
| --- | --- | --- |
| CNAME Record | `sms` | the exact `onrender.com` target shown by Render |

4. Do not edit the existing `@` or `www` DNS records.
5. Return to Render and verify the domain. Render provisions HTTPS automatically.

## Supabase Auth

In Supabase Dashboard → Authentication → URL Configuration, add these redirect URLs before sending traffic:

```text
https://sms.kodarai.xyz/numbers
https://sms.kodarai.xyz/dashboard
https://sms.kodarai.xyz/reset-password
```

The SMS landing page sends new or returning users to the existing `/numbers` workspace. On this separate deployment only, the Numbers workspace is available without the KodarAI Starter-plan gate so users can purchase numbers directly.

## Important: keep incoming SMS webhooks where they are

Leave `TELNYX_WEBHOOK_BASE_URL` and any provider webhook configuration pointed at the existing working service unless you deliberately move those endpoints. Both services use the same Supabase project, so the separate SMS service can safely read and manage the same numbers and messages.
