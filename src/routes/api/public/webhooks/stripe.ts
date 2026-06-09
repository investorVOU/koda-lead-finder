import { createFileRoute } from "@tanstack/react-router";
import {
  getStripeWebhookSecret,
  verifyStripeSignature,
  claimWebhookEvent,
  releaseWebhookEvent,
  applySubscription,
  applyCreditPack,
  markSubscriptionCanceled,
  creditReferrer,
} from "@/lib/billing.server";
import { activateVirtualNumber } from "@/lib/numbers.server";
import { creditWallet } from "@/lib/wallet.server";

export const Route = createFileRoute("/api/public/webhooks/stripe")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await request.text();
        const signature = request.headers.get("stripe-signature");

        let secret: string;
        try {
          secret = getStripeWebhookSecret();
        } catch {
          return new Response("Webhook not configured", { status: 500 });
        }

        if (!verifyStripeSignature(body, signature, secret)) {
          return new Response("Invalid signature", { status: 401 });
        }

        let event: any;
        try {
          event = JSON.parse(body);
        } catch {
          return new Response("Invalid payload", { status: 400 });
        }

        // Idempotency: skip events we've already handled
        const fresh = await claimWebhookEvent("stripe", String(event.id));
        if (!fresh) return new Response("ok", { status: 200 });

        try {
          const obj = event.data?.object ?? {};
          switch (event.type) {
            case "checkout.session.completed": {
              const userId = obj.metadata?.user_id || obj.client_reference_id;
              const kind = obj.metadata?.kind;
              const planId = obj.metadata?.plan_id;
              const amount = (obj.amount_total ?? 0) / 100;
              const reference = obj.id;
              if (!userId) break;
              if (kind === "wallet_topup") {
                const amountNgn = Number(obj.metadata?.amount_ngn ?? 0);
                if (amountNgn > 0) {
                  await creditWallet({
                    userId,
                    amountNgn,
                    type: "topup",
                    provider: "stripe",
                    reference,
                    description: `Wallet top-up via Stripe ($${amount.toFixed(2)} USD)`,
                  });
                }
                break;
              }
              if (kind === "number_rental") {
                const numberId = obj.metadata?.number_id;
                const phoneNumber = obj.metadata?.phone_number;
                if (numberId && phoneNumber) {
                  await activateVirtualNumber({ numberId, phoneNumber, userId, provider: "stripe", reference: obj.id, amount });
                }
                break;
              }
              if (!planId) break;
              if (kind === "subscription") {
                await applySubscription({
                  userId,
                  planId,
                  provider: "stripe",
                  providerCustomerId: obj.customer ?? null,
                  providerSubscriptionId: obj.subscription ?? null,
                  reference: obj.id,
                  currency: "USD",
                  amount,
                });
                await creditReferrer(userId); // award referrer on first purchase
              } else {
                await applyCreditPack({
                  userId,
                  packId: planId,
                  provider: "stripe",
                  reference: obj.id,
                  currency: "USD",
                  amount,
                });
              }
              break;
            }
            case "customer.subscription.deleted": {
              const userId = obj.metadata?.user_id;
              if (userId) await markSubscriptionCanceled({ userId });
              else await markSubscriptionCanceled({ provider: "stripe", providerCustomerId: obj.customer });
              break;
            }
            default:
              break;
          }
        } catch (e) {
          console.error("stripe webhook handler error", e);
          // Release the claim so Stripe's retry can re-process this event.
          await releaseWebhookEvent("stripe", String(event.id));
          return new Response("handler error", { status: 500 });
        }

        return new Response("ok", { status: 200 });
      },
    },
  },
});
