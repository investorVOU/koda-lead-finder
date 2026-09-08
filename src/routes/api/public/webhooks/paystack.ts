import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  getPaystackKey,
  verifyPaystackSignature,
  claimWebhookEvent,
  releaseWebhookEvent,
  applySubscription,
  applyCreditPack,
  markSubscriptionCanceled,
  creditReferrer,
} from "@/lib/billing.server";
import { activateVirtualNumber } from "@/lib/numbers.server";
import { creditWallet } from "@/lib/wallet.server";

type PaystackWebhookEvent = {
  event?: string;
  data?: {
    id?: string | number;
    reference?: string;
    subscription_code?: string;
    amount?: number;
    currency?: string;
    metadata?: {
      user_id?: string;
      kind?: string;
      plan_id?: string;
      amount_ngn?: number | string;
      number_id?: string;
      phone_number?: string;
    };
    customer?: {
      customer_code?: string;
    };
    email_token?: string;
  };
};

export const Route = createFileRoute("/api/public/webhooks/paystack")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await request.text();
        const signature = request.headers.get("x-paystack-signature");

        let secret: string;
        try {
          secret = getPaystackKey();
        } catch {
          return new Response("Webhook not configured", { status: 500 });
        }

        if (!verifyPaystackSignature(body, signature, secret)) {
          return new Response("Invalid signature", { status: 401 });
        }

        let event: PaystackWebhookEvent;
        try {
          event = JSON.parse(body) as PaystackWebhookEvent;
        } catch {
          return new Response("Invalid payload", { status: 400 });
        }

        const data = event.data ?? {};
        const eventId = `${event.event}:${data.id ?? data.reference ?? data.subscription_code ?? ""}`;

        const fresh = await claimWebhookEvent("paystack", eventId);
        if (!fresh) return new Response("ok", { status: 200 });

        try {
          switch (event.event) {
            case "charge.success": {
              const meta = data.metadata ?? {};
              const userId = meta.user_id;
              const kind = meta.kind;
              const planId = meta.plan_id;
              const amount = (data.amount ?? 0) / 100;
              const currency = data.currency ?? "NGN";
              if (!userId) break;
              if (kind === "wallet_topup") {
                const amountNgn = Number(meta.amount_ngn ?? data.amount / 100);
                await creditWallet({
                  userId,
                  amountNgn,
                  type: "topup",
                  provider: "paystack",
                  reference: data.reference,
                  description: `Wallet top-up via Paystack (₦${amountNgn.toLocaleString()})`,
                });
                // Mark user as onboarded after any successful paid fulfillment
                await supabaseAdmin.from("profiles").update({ onboarded: true }).eq("id", userId);
                break;
              }
              if (kind === "number_rental") {
                const numberId = meta.number_id;
                const phoneNumber = meta.phone_number;
                if (!numberId || !phoneNumber) break;
                await activateVirtualNumber({
                  numberId,
                  phoneNumber,
                  userId,
                  provider: "paystack",
                  reference: data.reference,
                  amount,
                });
              } else if (kind === "subscription") {
                if (!planId) break;
                await applySubscription({
                  userId,
                  planId,
                  provider: "paystack",
                  providerCustomerId: data.customer?.customer_code ?? null,
                  reference: data.reference,
                  currency,
                  amount,
                });
                await creditReferrer(userId); // award referrer on first purchase
              } else {
                if (!planId) break;
                await applyCreditPack({
                  userId,
                  packId: planId,
                  provider: "paystack",
                  reference: data.reference,
                  currency,
                  amount,
                });
              }

              // Mark user as onboarded after any successful paid fulfillment
              // (number_rental, subscription, credit_pack all land here)
              await supabaseAdmin.from("profiles").update({ onboarded: true }).eq("id", userId);

              break;
            }
            case "subscription.create": {
              // Store the subscription code + email token so we can cancel later.
              // Matched to the user via the customer code set on charge.success.
              const customerCode = data.customer?.customer_code;
              if (customerCode && data.subscription_code) {
                await supabaseAdmin
                  .from("subscriptions")
                  .update({
                    provider_subscription_id: data.subscription_code,
                    provider_subscription_token: data.email_token ?? null,
                    updated_at: new Date().toISOString(),
                  })
                  .eq("provider", "paystack")
                  .eq("provider_customer_id", customerCode);
              }
              break;
            }
            case "subscription.disable":
            case "subscription.not_renew": {
              const customerCode = data.customer?.customer_code;
              if (customerCode) {
                await markSubscriptionCanceled({
                  provider: "paystack",
                  providerCustomerId: customerCode,
                });
              }
              break;
            }
            default:
              break;
          }
        } catch {
          console.error("[billing] webhook handler failed");
          await releaseWebhookEvent("paystack", eventId);
          return new Response("handler error", { status: 500 });
        }

        return new Response("ok", { status: 200 });
      },
    },
  },
});
