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
} from "@/lib/billing.server";

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

        let event: any;
        try {
          event = JSON.parse(body);
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
              if (!userId || !planId) break;
              if (kind === "subscription") {
                await applySubscription({
                  userId,
                  planId,
                  provider: "paystack",
                  providerCustomerId: data.customer?.customer_code ?? null,
                  reference: data.reference,
                  currency,
                  amount,
                });
              } else {
                await applyCreditPack({
                  userId,
                  packId: planId,
                  provider: "paystack",
                  reference: data.reference,
                  currency,
                  amount,
                });
              }
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
        } catch (e) {
          console.error("paystack webhook handler error", e);
          await releaseWebhookEvent("paystack", eventId);
          return new Response("handler error", { status: 500 });
        }

        return new Response("ok", { status: 200 });
      },
    },
  },
});
