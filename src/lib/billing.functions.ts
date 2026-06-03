import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { findPlan, findPack } from "@/lib/billing";
import { stripeFetch, paystackFetch, getPaystackPlanCode } from "@/lib/billing.server";

const checkoutSchema = z.object({
  provider: z.enum(["stripe", "paystack"]),
  kind: z.enum(["subscription", "pack"]),
  id: z.string().min(1).max(40),
  origin: z.string().url().max(300),
});

export const createCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => checkoutSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { userId, supabase } = context;

    const { data: userData } = await supabase.auth.getUser();
    const email = userData.user?.email ?? "";

    const { data: subRow } = await supabaseAdmin
      .from("subscriptions")
      .select("provider, provider_customer_id")
      .eq("user_id", userId)
      .maybeSingle();
    const sub = subRow as { provider?: string; provider_customer_id?: string } | null;

    const successUrl = `${data.origin}/billing?status=success`;
    const cancelUrl = `${data.origin}/billing?status=cancel`;

    try {
      if (data.provider === "stripe") {
        const stripeCustomer = sub?.provider === "stripe" ? sub.provider_customer_id : null;
        const base: Record<string, string | number> = {
          success_url: successUrl,
          cancel_url: cancelUrl,
          client_reference_id: userId,
          "line_items[0][quantity]": 1,
          "line_items[0][price_data][currency]": "usd",
          "metadata[user_id]": userId,
        };
        if (stripeCustomer) base.customer = stripeCustomer;
        else if (email) base.customer_email = email;

        if (data.kind === "subscription") {
          const plan = findPlan(data.id);
          if (!plan) return { error: "bad_request", message: "Unknown plan." } as const;
          const session = await stripeFetch<{ url: string }>("/checkout/sessions", {
            ...base,
            mode: "subscription",
            "metadata[kind]": "subscription",
            "metadata[plan_id]": plan.id,
            "subscription_data[metadata][user_id]": userId,
            "subscription_data[metadata][plan_id]": plan.id,
            "line_items[0][price_data][unit_amount]": plan.usd * 100,
            "line_items[0][price_data][recurring][interval]": "month",
            "line_items[0][price_data][product_data][name]": `KodaRai ${plan.name} (${plan.credits} leads/mo)`,
          });
          return { url: session.url } as const;
        }

        const pack = findPack(data.id);
        if (!pack) return { error: "bad_request", message: "Unknown pack." } as const;
        const session = await stripeFetch<{ url: string }>("/checkout/sessions", {
          ...base,
          mode: "payment",
          "metadata[kind]": "pack",
          "metadata[plan_id]": pack.id,
          "payment_intent_data[metadata][user_id]": userId,
          "line_items[0][price_data][unit_amount]": pack.usd * 100,
          "line_items[0][price_data][product_data][name]": `KodaRai ${pack.name} (${pack.credits} leads)`,
        });
        return { url: session.url } as const;
      }

      // Paystack (NGN)
      if (!email) return { error: "no_email", message: "An email is required for Paystack." } as const;

      if (data.kind === "subscription") {
        const plan = findPlan(data.id);
        if (!plan) return { error: "bad_request", message: "Unknown plan." } as const;
        const planCode = await getPaystackPlanCode(plan);
        const res = await paystackFetch<{ data: { authorization_url: string } }>(
          "/transaction/initialize",
          "POST",
          {
            email,
            amount: plan.ngn * 100,
            plan: planCode,
            currency: "NGN",
            callback_url: successUrl,
            metadata: { user_id: userId, kind: "subscription", plan_id: plan.id },
          },
        );
        return { url: res.data.authorization_url } as const;
      }

      const pack = findPack(data.id);
      if (!pack) return { error: "bad_request", message: "Unknown pack." } as const;
      const res = await paystackFetch<{ data: { authorization_url: string } }>(
        "/transaction/initialize",
        "POST",
        {
          email,
          amount: pack.ngn * 100,
          currency: "NGN",
          callback_url: successUrl,
          metadata: { user_id: userId, kind: "pack", plan_id: pack.id },
        },
      );
      return { url: res.data.authorization_url } as const;
    } catch (e) {
      console.error("checkout error", e);
      return {
        error: "checkout_failed",
        message: e instanceof Error ? e.message : "Could not start checkout.",
      } as const;
    }
  });

export const cancelSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { data: subRow } = await supabaseAdmin
      .from("subscriptions")
      .select("provider, provider_subscription_id, provider_subscription_token")
      .eq("user_id", userId)
      .maybeSingle();
    const sub = subRow as {
      provider?: string;
      provider_subscription_id?: string;
      provider_subscription_token?: string;
    } | null;

    try {
      if (sub?.provider === "stripe" && sub.provider_subscription_id) {
        await stripeFetch(`/subscriptions/${sub.provider_subscription_id}`, {
          cancel_at_period_end: "true",
        });
      } else if (
        sub?.provider === "paystack" &&
        sub.provider_subscription_id &&
        sub.provider_subscription_token
      ) {
        await paystackFetch("/subscription/disable", "POST", {
          code: sub.provider_subscription_id,
          token: sub.provider_subscription_token,
        });
      }
      await supabaseAdmin
        .from("subscriptions")
        .update({ status: "canceling", updated_at: new Date().toISOString() })
        .eq("user_id", userId);
      return { ok: true } as const;
    } catch (e) {
      console.error("cancel error", e);
      return {
        error: "cancel_failed",
        message: e instanceof Error ? e.message : "Could not cancel subscription.",
      } as const;
    }
  });

const portalSchema = z.object({ origin: z.string().url().max(300) });

export const createBillingPortal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => portalSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { data: subRow } = await supabaseAdmin
      .from("subscriptions")
      .select("provider, provider_customer_id")
      .eq("user_id", userId)
      .maybeSingle();
    const sub = subRow as { provider?: string; provider_customer_id?: string } | null;

    if (sub?.provider !== "stripe" || !sub.provider_customer_id) {
      return { error: "unavailable", message: "No Stripe billing account to manage." } as const;
    }
    try {
      const session = await stripeFetch<{ url: string }>("/billing_portal/sessions", {
        customer: sub.provider_customer_id,
        return_url: `${data.origin}/billing`,
      });
      return { url: session.url } as const;
    } catch (e) {
      console.error("portal error", e);
      return {
        error: "portal_failed",
        message: e instanceof Error ? e.message : "Could not open billing portal.",
      } as const;
    }
  });
