import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  findPlan,
  findPack,
  getPlanPrice,
  type BillingCycle,
} from "@/lib/billing";
import {
  paystackFetch,
  getPaystackPlanCode,
} from "@/lib/billing.server";
import { sendUserTransactionalEmail } from "@/lib/email.server";

const checkoutSchema = z.object({
  kind: z.enum(["subscription", "pack"]),
  id: z.string().min(1).max(40),
  cycle: z.enum(["monthly", "annually"]).optional(),
  renewalMode: z.enum(["manual", "auto"]).optional(),
  origin: z.string().url().max(300),
});

export const createCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => checkoutSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { userId, supabase } = context;

    const { data: userData } = await supabase.auth.getUser();
    const email = userData.user?.email ?? "";

    const successUrl = `${data.origin}/billing?status=success`;

    try {
      if (!email) {
        return {
          error: "no_email",
          message: "An email is required for Paystack.",
        } as const;
      }

      if (data.kind === "subscription") {
        const plan = findPlan(data.id);

        if (!plan) {
          return {
            error: "bad_request",
            message: "Unknown plan.",
          } as const;
        }

        const cycle: BillingCycle = data.cycle ?? "monthly";
        const renewalMode = data.renewalMode ?? "auto";
        const amount = getPlanPrice(plan, cycle);

        const payload: Record<string, unknown> = {
          email,
          amount: amount * 100,
          currency: "NGN",
          callback_url: successUrl,
          metadata: {
            user_id: userId,
            kind: "subscription",
            plan_id: plan.id,
            cycle,
            renewal_mode: renewalMode,
          },
        };

        // Only attach a Paystack recurring plan when the user
        // explicitly chooses automatic renewal.
        //
        // Manual payment remains a normal one-time Paystack charge,
        // allowing Paystack to offer its broader supported payment methods.
        if (renewalMode === "auto") {
          const planCode = await getPaystackPlanCode(plan, cycle);
          payload.plan = planCode;
        }

        const res = await paystackFetch<{
          data: {
            authorization_url: string;
          };
        }>(
          "/transaction/initialize",
          "POST",
          payload,
        );

        return {
          url: res.data.authorization_url,
        } as const;
      }

      const pack = findPack(data.id);

      if (!pack) {
        return {
          error: "bad_request",
          message: "Unknown pack.",
        } as const;
      }

      const res = await paystackFetch<{
        data: {
          authorization_url: string;
        };
      }>(
        "/transaction/initialize",
        "POST",
        {
          email,
          amount: pack.ngn * 100,
          currency: "NGN",
          callback_url: successUrl,
          metadata: {
            user_id: userId,
            kind: "pack",
            plan_id: pack.id,
          },
        },
      );

      return {
        url: res.data.authorization_url,
      } as const;
    } catch (e) {
      console.error("checkout error", e);

      return {
        error: "checkout_failed",
        message:
          e instanceof Error
            ? e.message
            : "Could not start checkout.",
      } as const;
    }
  });

export const cancelSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;

    const { data: subRow } = await supabaseAdmin
      .from("subscriptions")
      .select(
        "provider_subscription_id, provider_subscription_token",
      )
      .eq("user_id", userId)
      .maybeSingle();

    const sub = subRow as {
      provider_subscription_id?: string;
      provider_subscription_token?: string;
    } | null;

    try {
      if (
        sub?.provider_subscription_id &&
        sub.provider_subscription_token
      ) {
        await paystackFetch(
          "/subscription/disable",
          "POST",
          {
            code: sub.provider_subscription_id,
            token: sub.provider_subscription_token,
          },
        );
      }

      await supabaseAdmin
        .from("subscriptions")
        .update({
          status: "canceling",
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);

      await sendUserTransactionalEmail(userId, {
        subject:
          "Your KodarAI subscription will not renew",
        title:
          "Your subscription cancellation is scheduled",
        preview:
          "Your plan remains available until the end of the current billing period.",
        body:
          "Your subscription will not renew. You can keep using your plan until the end of the current billing period.",
        ctaLabel: "View billing",
        ctaUrl: `${(
          process.env.APP_URL ||
          "https://kodarai.xyz"
        ).replace(/\/$/, "")}/billing`,
      });

      return { ok: true } as const;
    } catch (e) {
      console.error("cancel error", e);

      return {
        error: "cancel_failed",
        message:
          e instanceof Error
            ? e.message
            : "Could not cancel subscription.",
      } as const;
    }
  });
