import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { stripeFetch, paystackFetch } from "@/lib/billing.server";
import { getCachedFxRate } from "@/lib/wallet.server";
import { verifyHCaptcha } from "@/lib/hcaptcha.server";

// Derive redirect base URL server-side — never trust the client origin
function appUrl(): string {
  return process.env.APP_URL ?? "https://kodarai.xyz";
}

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
  amountNgn:    z.number().min(500).max(500000),
  provider:     z.enum(["stripe", "paystack"]),
  captchaToken: z.string().min(1).optional(), // optional so non-hcaptcha contexts still work
});

export const initiateWalletTopUp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => topUpSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { userId, supabase } = context;

    // hCaptcha verification — blocks bots from spamming payment sessions
    if (data.captchaToken) {
      const ok = await verifyHCaptcha(data.captchaToken);
      if (!ok) return { error: true, message: "Captcha verification failed. Please try again." } as const;
    }

    const { data: userData } = await supabase.auth.getUser();
    const email = userData.user?.email ?? "";

    const base       = appUrl();
    const successUrl = `${base}/numbers?wallet=funded`;
    const cancelUrl  = `${base}/numbers`;

    if (data.provider === "stripe") {
      const fxRate    = await getCachedFxRate();
      const amountUsd = Math.ceil((data.amountNgn / fxRate) * 100); // cents
      try {
        const session = await stripeFetch<{ url: string }>("/checkout/sessions", {
          mode: "payment",
          success_url: successUrl,
          cancel_url:  cancelUrl,
          client_reference_id: userId,
          customer_email: email,
          "metadata[user_id]":       userId,
          "metadata[kind]":          "wallet_topup",
          "metadata[amount_ngn]":    String(data.amountNgn),
          "payment_intent_data[metadata][user_id]":      userId,
          "payment_intent_data[metadata][kind]":         "wallet_topup",
          "payment_intent_data[metadata][amount_ngn]":   String(data.amountNgn),
          "line_items[0][quantity]": 1,
          "line_items[0][price_data][currency]":         "usd",
          "line_items[0][price_data][unit_amount]":       amountUsd,
          "line_items[0][price_data][product_data][name]":
            `Kodarai Wallet Top-up (₦${data.amountNgn.toLocaleString()})`,
        });
        return { url: session.url } as const;
      } catch (e: unknown) {
        return { error: true, message: e instanceof Error ? e.message : "Stripe error" } as const;
      }
    }

    // ── Paystack (NGN) ────────────────────────────────────────────────────────
    if (!email) return { error: true, message: "Email required for Paystack" } as const;
    try {
      const ref = `wallet_${userId}_${Date.now()}`;
      const res = await paystackFetch<{ data: { authorization_url: string } }>(
        "/transaction/initialize",
        "POST",
        {
          email,
          amount:       Math.round(data.amountNgn * 100), // kobo
          currency:     "NGN",
          reference:    ref,
          callback_url: successUrl,
          metadata: {
            user_id:    userId,
            kind:       "wallet_topup",
            amount_ngn: data.amountNgn,
          },
        },
      );
      return { url: res.data.authorization_url } as const;
    } catch (e: unknown) {
      return { error: true, message: e instanceof Error ? e.message : "Paystack error" } as const;
    }
  });
