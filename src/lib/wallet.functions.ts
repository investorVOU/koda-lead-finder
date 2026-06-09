import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { stripeFetch, paystackFetch } from "@/lib/billing.server";
import { getCachedFxRate } from "@/lib/wallet.server";

export const getWalletData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const [profileRes, txRes, fxRate] = await Promise.all([
      supabaseAdmin.from("profiles").select("wallet_balance").eq("id", userId).single(),
      supabaseAdmin
        .from("number_transactions")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(20),
      getCachedFxRate(),
    ]);
    return {
      balance: (profileRes.data?.wallet_balance as number) ?? 0,
      transactions: txRes.data ?? [],
      fxRate,
    } as const;
  });

const topUpSchema = z.object({
  amountNgn: z.number().min(500).max(500000),
  provider: z.enum(["stripe", "paystack"]),
  origin: z.string().url(),
});

export const initiateWalletTopUp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => topUpSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { userId, supabase } = context;
    const { data: userData } = await supabase.auth.getUser();
    const email = userData.user?.email ?? "";

    const successUrl = `${data.origin}/numbers?wallet=funded`;
    const cancelUrl  = `${data.origin}/numbers`;

    if (data.provider === "stripe") {
      const fxRate = await getCachedFxRate();
      const amountUsd = Math.ceil((data.amountNgn / fxRate) * 100); // cents
      try {
        const session = await stripeFetch<{ url: string }>("/checkout/sessions", {
          mode: "payment",
          success_url: successUrl,
          cancel_url:  cancelUrl,
          client_reference_id: userId,
          customer_email: email,
          "metadata[user_id]": userId,
          "metadata[kind]": "wallet_topup",
          "metadata[amount_ngn]": String(data.amountNgn),
          "payment_intent_data[metadata][user_id]": userId,
          "payment_intent_data[metadata][kind]": "wallet_topup",
          "payment_intent_data[metadata][amount_ngn]": String(data.amountNgn),
          "line_items[0][quantity]": 1,
          "line_items[0][price_data][currency]": "usd",
          "line_items[0][price_data][unit_amount]": amountUsd,
          "line_items[0][price_data][product_data][name]": `Kodarai Wallet Top-up (₦${data.amountNgn.toLocaleString()})`,
        });
        return { url: session.url } as const;
      } catch (e: any) {
        return { error: true, message: e.message } as const;
      }
    }

    // Paystack
    if (!email) return { error: true, message: "Email required for Paystack" } as const;
    try {
      const ref = `wallet_${userId}_${Date.now()}`;
      const init = await paystackFetch<{ authorization_url: string }>("/transaction/initialize", {
        email,
        amount: String(Math.round(data.amountNgn * 100)),
        currency: "NGN",
        reference: ref,
        callback_url: successUrl,
        metadata: JSON.stringify({
          user_id: userId,
          kind: "wallet_topup",
          amount_ngn: data.amountNgn,
        }),
      });
      return { url: init.authorization_url } as const;
    } catch (e: any) {
      return { error: true, message: e.message } as const;
    }
  });
