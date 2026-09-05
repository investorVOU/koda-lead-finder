import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sendUserTransactionalEmail } from "@/lib/email.server";

export async function creditWallet({
  userId,
  amountNgn,
  type,
  provider,
  reference,
  description,
}: {
  userId: string;
  amountNgn: number;
  type: string;
  provider?: string;
  reference?: string;
  description?: string;
}) {
  const { error } = await supabaseAdmin.rpc("credit_wallet", {
    p_user_id: userId,
    p_amount: amountNgn,
    p_type: type,
    p_provider: provider ?? null,
    p_reference: reference ?? null,
    p_description: description ?? null,
  });
  if (error) throw error;

  if (type === "topup" || type === "refund") {
    await sendUserTransactionalEmail(userId, {
      subject: type === "topup" ? "Your KodarAI wallet was topped up" : "Your KodarAI wallet was refunded",
      title: type === "topup" ? "Wallet funds added" : "Wallet refund added",
      preview: `â‚¦${amountNgn.toLocaleString("en-NG")} was added to your KodarAI wallet.`,
      body: `â‚¦${amountNgn.toLocaleString("en-NG")} was added to your KodarAI wallet.${description ? `\n\n${description}` : ""}`,
      ctaLabel: "Open virtual numbers",
      ctaUrl: `${(process.env.APP_URL || "https://kodarai.xyz").replace(/\/$/, "")}/numbers`,
    });
  }
}

export async function debitWallet({
  userId,
  amountNgn,
  phoneNumber,
  description,
}: {
  userId: string;
  amountNgn: number;
  phoneNumber: string;
  description?: string;
}): Promise<boolean> {
  const { data, error } = await supabaseAdmin.rpc("debit_wallet", {
    p_user_id: userId,
    p_amount: amountNgn,
    p_type: "purchase",
    p_number: phoneNumber,
    p_description: description ?? `Virtual number ${phoneNumber}`,
  });
  if (error) throw error;
  return data as boolean;
}

export async function getWalletBalance(userId: string): Promise<number> {
  const { data } = await supabaseAdmin
    .from("profiles")
    .select("wallet_balance")
    .eq("id", userId)
    .single();
  return (data?.wallet_balance as number) ?? 0;
}

export async function getCachedFxRate(): Promise<number> {
  const FALLBACK_RATE = 1320;
  const CACHE_DURATION_MS = 30 * 60 * 1000; // 30 minutes

  const { data } = await supabaseAdmin
    .from("fx_rates")
    .select("rate, fetched_at")
    .eq("currency_pair", "USD_NGN")
    .maybeSingle();

  // Use cached rate if it is still fresh
  if (data?.rate && data?.fetched_at) {
    const ageMs =
      Date.now() - new Date(data.fetched_at).getTime();

    if (
      ageMs < CACHE_DURATION_MS &&
      Number(data.rate) > 0
    ) {
      return Number(data.rate);
    }
  }

  // Cache missing or expired: fetch current USD/NGN rate
  try {
    const res = await fetch(
      "https://open.er-api.com/v6/latest/USD"
    );

    if (!res.ok) {
      throw new Error(`FX API returned HTTP ${res.status}`);
    }

    const json = await res.json();
    const rate = Number(json?.rates?.NGN);

    if (Number.isFinite(rate) && rate > 0) {
      await supabaseAdmin
        .from("fx_rates")
        .upsert(
          {
            currency_pair: "USD_NGN",
            rate,
            fetched_at: new Date().toISOString(),
          },
          {
            onConflict: "currency_pair",
          }
        );

      return rate;
    }
  } catch (error) {
    console.error("Failed to refresh USD/NGN FX rate:", error);
  }

  // Live API failed: use previous cached rate if available
  if (data?.rate && Number(data.rate) > 0) {
    return Number(data.rate);
  }

  // Emergency fallback only
  return FALLBACK_RATE;
}

