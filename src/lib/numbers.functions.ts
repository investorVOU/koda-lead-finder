import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getTwilioClient, getTwilioWebhookUrl } from "@/lib/twilio.server";
import { stripeFetch, paystackFetch } from "@/lib/billing.server";
import { NUMBER_COUNTRIES } from "@/lib/numbers";

// ── Search available numbers ──────────────────────────────────────────────────

export const searchAvailableNumbers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ country: z.string().length(2), type: z.enum(["local", "mobile", "tollFree"]) }).parse(d),
  )
  .handler(async ({ data }) => {
    try {
      const client = getTwilioClient();
      const results = await (client.availablePhoneNumbers(data.country) as any)
        [data.type].list({ limit: 10, smsEnabled: true });
      return {
        numbers: results.map((n: any) => ({
          phoneNumber: n.phoneNumber,
          friendlyName: n.friendlyName,
          region: n.region,
          locality: n.locality,
        })),
      } as const;
    } catch (e: any) {
      return { error: true, message: e.message ?? "Failed to search numbers" } as const;
    }
  });

// ── Initiate purchase (creates pending record + checkout session) ──────────────

const purchaseSchema = z.object({
  phoneNumber: z.string().min(7),
  country: z.string().length(2),
  provider: z.enum(["stripe", "paystack"]),
  origin: z.string().url(),
});

export const initiateNumberPurchase = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => purchaseSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { userId, supabase } = context;

    const countryInfo = NUMBER_COUNTRIES.find((c) => c.code === data.country);
    if (!countryInfo) return { error: true, message: "Unknown country" } as const;

    const { data: userData } = await supabase.auth.getUser();
    const email = userData.user?.email ?? "";

    // Create a placeholder record (twilio_sid placeholder until provisioned)
    const pendingSid = `pending_${Date.now()}`;
    const { data: numRow, error: dbErr } = await supabaseAdmin
      .from("virtual_numbers")
      .insert({
        user_id: userId,
        twilio_sid: pendingSid,
        phone_number: data.phoneNumber,
        country_code: data.country,
        status: "pending_payment",
        monthly_usd: countryInfo.usd,
        monthly_ngn: countryInfo.ngn,
        expires_at: new Date(Date.now() + 31 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select("id")
      .single();

    if (dbErr || !numRow) return { error: true, message: "Failed to create number record" } as const;

    const successUrl = `${data.origin}/numbers?status=success`;
    const cancelUrl  = `${data.origin}/numbers?status=cancel`;

    if (data.provider === "stripe") {
      try {
        const session = await stripeFetch<{ url: string }>("/checkout/sessions", {
          mode: "payment",
          success_url: successUrl,
          cancel_url: cancelUrl,
          client_reference_id: userId,
          customer_email: email,
          "metadata[user_id]": userId,
          "metadata[kind]": "number_rental",
          "metadata[number_id]": numRow.id,
          "metadata[phone_number]": data.phoneNumber,
          "metadata[country]": data.country,
          "payment_intent_data[metadata][user_id]": userId,
          "payment_intent_data[metadata][kind]": "number_rental",
          "line_items[0][quantity]": 1,
          "line_items[0][price_data][currency]": "usd",
          "line_items[0][price_data][unit_amount]": Math.round(countryInfo.usd * 100),
          "line_items[0][price_data][product_data][name]": `Kodarai Virtual Number (${data.country}) — 1 month`,
        });
        return { url: session.url } as const;
      } catch (e: any) {
        return { error: true, message: e.message } as const;
      }
    }

    // Paystack (NGN)
    if (!email) return { error: true, message: "Email required for Paystack" } as const;
    try {
      const ref = `num_${numRow.id}_${Date.now()}`;
      const init = await paystackFetch<{ authorization_url: string }>("/transaction/initialize", {
        email,
        amount: String(Math.round(countryInfo.ngn * 100)),
        currency: "NGN",
        reference: ref,
        callback_url: successUrl,
        metadata: JSON.stringify({
          user_id: userId,
          kind: "number_rental",
          number_id: numRow.id,
          phone_number: data.phoneNumber,
          country: data.country,
        }),
      });
      return { url: init.authorization_url } as const;
    } catch (e: any) {
      return { error: true, message: e.message } as const;
    }
  });

// ── List user's numbers ───────────────────────────────────────────────────────

export const getUserNumbers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { data, error } = await supabaseAdmin
      .from("virtual_numbers")
      .select("*")
      .eq("user_id", userId)
      .neq("status", "released")
      .order("created_at", { ascending: false });
    if (error) return { error: true, message: error.message } as const;
    return { numbers: data ?? [] } as const;
  });

// ── Get all SMS messages across all user numbers ──────────────────────────────

export const getAllMessages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { data: msgs, error } = await supabaseAdmin
      .from("sms_messages")
      .select("*, virtual_numbers(phone_number, country_code)")
      .eq("user_id", userId)
      .order("received_at", { ascending: false })
      .limit(100);
    if (error) return { error: true, message: error.message } as const;
    return { messages: msgs ?? [] } as const;
  });

// ── Get SMS messages for a number ─────────────────────────────────────────────

export const getNumberMessages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ numberId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { data: msgs, error } = await supabaseAdmin
      .from("sms_messages")
      .select("*")
      .eq("number_id", data.numberId)
      .eq("user_id", userId)
      .order("received_at", { ascending: false })
      .limit(50);
    if (error) return { error: true, message: error.message } as const;
    return { messages: msgs ?? [] } as const;
  });

// ── Release (delete) a number ─────────────────────────────────────────────────

export const releaseNumber = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ numberId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context;

    const { data: num } = await supabaseAdmin
      .from("virtual_numbers")
      .select("twilio_sid")
      .eq("id", data.numberId)
      .eq("user_id", userId)
      .single();

    if (!num) return { error: true, message: "Number not found" } as const;

    // Release from Twilio (ignore errors if already released)
    if (num.twilio_sid && !num.twilio_sid.startsWith("pending_")) {
      try {
        const client = getTwilioClient();
        await client.incomingPhoneNumbers(num.twilio_sid).remove();
      } catch { /* already removed or doesn't exist */ }
    }

    await supabaseAdmin
      .from("virtual_numbers")
      .update({ status: "released" })
      .eq("id", data.numberId)
      .eq("user_id", userId);

    return { success: true } as const;
  });

// ── Buy number from wallet balance ────────────────────────────────────────────

const walletBuySchema = z.object({
  phoneNumber: z.string().min(7),
  country: z.string().length(2),
});

export const buyNumberFromWallet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => walletBuySchema.parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const countryInfo = NUMBER_COUNTRIES.find((c) => c.code === data.country);
    if (!countryInfo) return { error: true, message: "Unknown country" } as const;

    // Import here to avoid circular deps at top-level
    const { debitWallet } = await import("@/lib/wallet.server");
    const { activateVirtualNumber } = await import("@/lib/numbers.server");

    const pendingSid = `pending_${Date.now()}`;
    const { data: numRow, error: dbErr } = await supabaseAdmin
      .from("virtual_numbers")
      .insert({
        user_id: userId,
        twilio_sid: pendingSid,
        phone_number: data.phoneNumber,
        country_code: data.country,
        status: "pending_payment",
        monthly_usd: countryInfo.usd,
        monthly_ngn: countryInfo.ngn,
      })
      .select("id")
      .single();

    if (dbErr || !numRow) return { error: true, message: "Failed to create record" } as const;

    // Debit wallet
    const ok = await debitWallet({
      userId,
      amountNgn: countryInfo.ngn,
      phoneNumber: data.phoneNumber,
    });
    if (!ok) {
      // Cleanup pending record
      await supabaseAdmin.from("virtual_numbers").delete().eq("id", numRow.id);
      return { error: true, message: "Insufficient wallet balance" } as const;
    }

    // Provision on Twilio and activate
    try {
      await activateVirtualNumber({
        numberId: numRow.id,
        phoneNumber: data.phoneNumber,
        userId,
        provider: "wallet",
        reference: `wallet_${numRow.id}`,
        amount: countryInfo.ngn,
      });
      return { success: true } as const;
    } catch (e: any) {
      // Refund wallet on Twilio failure
      const { creditWallet } = await import("@/lib/wallet.server");
      await creditWallet({
        userId,
        amountNgn: countryInfo.ngn,
        type: "refund",
        description: `Refund for failed number provision ${data.phoneNumber}`,
      });
      await supabaseAdmin.from("virtual_numbers").delete().eq("id", numRow.id);
      return { error: true, message: `Twilio error: ${e.message}` } as const;
    }
  });
