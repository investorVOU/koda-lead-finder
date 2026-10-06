Inspect the KodarAi codebase first, then implement this conversion-focused change.

KodarAi’s core value proposition is that users can use it to build things they can sell to clients/businesses and earn money. Do NOT treat it as merely an AI website builder.

Current problem:
Users coming from Meta ads reach /signup and /choose-plan but most leave without signing up. The current /choose-plan page presents multiple plans and feels like a normal SaaS paywall.

Change the funnel:

1. REDESIGN /signup
    Make it clearly communicate:
    “Build. Sell. Earn.”

Explain briefly and honestly:
Users can use KodarAi to create websites, digital products and other solutions for clients/businesses and charge clients for their work.

Show the simple process:
Find a client → Build with KodarAi → Deliver → Get paid

Do not make guaranteed-income or get-rich claims.

Make the signup CTA compelling, e.g. “Start Building & Earning”.

2. REDESIGN /choose-plan
    For now show ONLY ONE user-facing plan:

Starter
₦500

Preselect it automatically.

Hide the other plans from this page for now, but DO NOT delete them from the backend/database because we may restore them later.

Primary CTA:
“Pay ₦500 & Start Earning”

The button must use the REAL existing payment flow and REAL Starter plan. Do not hardcode a fake frontend-only price.

Explain clearly what the ₦500 gives the user and how KodarAi can be used to create things they can sell.

Page structure:

* Start Building. Start Earning.
* Short explanation of KodarAi
* How it works: Find client → Build → Deliver → Get paid
* ₦500 Starter plan
* Pay ₦500 & Start Earning CTA
* Short FAQ/trust section

Keep it professional and trustworthy. No fake testimonials, fake earnings, guaranteed income, fake scarcity or get-rich language.

3. ANALYTICS
    Inspect the existing Meta Pixel implementation.

Make sure successful signup fires CompleteRegistration (or the existing appropriate registration event), and confirmed successful payment fires Purchase.

Do not fire these events merely from page views or button clicks.

4. IMPORTANT
    Before editing, inspect the existing code and identify:

* signup component
* choose-plan component
* pricing source of truth
* payment implementation
* existing Meta Pixel/events

Do not break authentication, payments, existing plans, or unrelated functionality.

After making the changes, give me:

* files changed
* what changed
* how the ₦500 plan connects to the real payment system
* Meta events implemented
* anything I need to test

Implement the changes now.