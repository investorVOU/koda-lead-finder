import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { stripeFetch, paystackFetch } from "@/lib/billing.server";
import { NUMBER_COUNTRIES } from "@/lib/numbers";
import {
  searchTelnyxNumbers,
  requestSMSPoolNumber,
  pollSMSPoolInbox,
} from "@/lib/services/phone-numbers";

// ── Search available Telnyx numbers ──────────────────────────────────────────

export const searchAvailableNumbers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ country: z.string().length(2), type: z.enum(["local", "mobile", "tollFree"]).optional() }).parse(d),
  )
  .handler(async ({ data }) => {
    try {
      const results = await searchTelnyxNumbers(data.country, ["sms"]);
      return {
        numbers: results.map((n) => ({
          phoneNumber: n.phoneNumber,
          friendlyName: n.phoneNumber,
          region: n.region,
          locality: n.locality,
          monthlyCostUsd: n.monthlyCostUsd,
        })),
      } as const;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to search numbers";
      return { error: true, message: msg } as const;
    }
  });

// ── Initiate Telnyx number purchase (checkout session) ────────────────────────

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

    // Create pending record
    const pendingSid = `pending_${Date.now()}`;
    const { data: numRow, error: dbErr } = await supabaseAdmin
      .from("virtual_numbers")
      .insert({
        user_id:      userId,
        twilio_sid:   pendingSid,
        phone_number: data.phoneNumber,
        country_code: data.country,
        provider:     "telnyx",
        status:       "pending_payment",
        monthly_usd:  countryInfo.usd,
        monthly_ngn:  countryInfo.ngn,
        expires_at:   new Date(Date.now() + 31 * 24 * 60 * 60 * 1000).toISOString(),
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
          cancel_url:  cancelUrl,
          client_reference_id: userId,
          customer_email: email,
          "metadata[user_id]":       userId,
          "metadata[kind]":          "number_rental",
          "metadata[number_id]":     numRow.id,
          "metadata[phone_number]":  data.phoneNumber,
          "metadata[country]":       data.country,
          "payment_intent_data[metadata][user_id]": userId,
          "payment_intent_data[metadata][kind]":    "number_rental",
          "line_items[0][quantity]": 1,
          "line_items[0][price_data][currency]": "usd",
          "line_items[0][price_data][unit_amount]": Math.round(countryInfo.usd * 100),
          "line_items[0][price_data][product_data][name]": `Kodarai Virtual Number (${data.country}) — 1 month`,
        });
        return { url: session.url } as const;
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Stripe error";
        return { error: true, message: msg } as const;
      }
    }

    // Paystack (NGN)
    if (!email) return { error: true, message: "Email required for Paystack" } as const;
    try {
      const ref  = `num_${numRow.id}_${Date.now()}`;
      const init = await paystackFetch<{ authorization_url: string }>("/transaction/initialize", {
        email,
        amount:       String(Math.round(countryInfo.ngn * 100)),
        currency:     "NGN",
        reference:    ref,
        callback_url: successUrl,
        metadata:     JSON.stringify({
          user_id:      userId,
          kind:         "number_rental",
          number_id:    numRow.id,
          phone_number: data.phoneNumber,
          country:      data.country,
        }),
      });
      return { url: init.authorization_url } as const;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Paystack error";
      return { error: true, message: msg } as const;
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

// ── Get all SMS messages (inbox view) ─────────────────────────────────────────

export const getAllMessages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { data: msgs, error } = await supabaseAdmin
      .from("sms_messages")
      .select("*, virtual_numbers(phone_number, country_code, provider)")
      .eq("user_id", userId)
      .order("received_at", { ascending: false })
      .limit(100);
    if (error) return { error: true, message: error.message } as const;
    return { messages: msgs ?? [] } as const;
  });

// ── Get SMS messages for a specific number ────────────────────────────────────

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

// ── Release (delete) a Telnyx number ─────────────────────────────────────────

export const releaseNumber = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ numberId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context;

    const { data: num } = await supabaseAdmin
      .from("virtual_numbers")
      .select("provider_sid, twilio_sid, provider")
      .eq("id", data.numberId)
      .eq("user_id", userId)
      .single();

    if (!num) return { error: true, message: "Number not found" } as const;

    // Release from Telnyx (SMSPool numbers auto-expire, no release needed)
    const sid = num.provider_sid ?? num.twilio_sid;
    if (num.provider === "telnyx" && sid && !sid.startsWith("pending_")) {
      try {
        const { releaseTelnyxNumber } = await import("@/lib/services/phone-numbers");
        await releaseTelnyxNumber(sid);
      } catch (e) {
        console.error("[numbers] Telnyx release error:", e);
        // Don't fail — still mark as released in DB
      }
    }

    await supabaseAdmin
      .from("virtual_numbers")
      .update({ status: "released" })
      .eq("id", data.numberId)
      .eq("user_id", userId);

    return { success: true } as const;
  });

// ── Buy Telnyx number from wallet balance ─────────────────────────────────────

const walletBuySchema = z.object({
  phoneNumber: z.string().min(7),
  country:     z.string().length(2),
});

export const buyNumberFromWallet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => walletBuySchema.parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const countryInfo = NUMBER_COUNTRIES.find((c) => c.code === data.country);
    if (!countryInfo) return { error: true, message: "Unknown country" } as const;

    const { debitWallet }           = await import("@/lib/wallet.server");
    const { activateVirtualNumber } = await import("@/lib/numbers.server");

    const pendingSid = `pending_${Date.now()}`;
    const { data: numRow, error: dbErr } = await supabaseAdmin
      .from("virtual_numbers")
      .insert({
        user_id:      userId,
        twilio_sid:   pendingSid,
        phone_number: data.phoneNumber,
        country_code: data.country,
        provider:     "telnyx",
        status:       "pending_payment",
        monthly_usd:  countryInfo.usd,
        monthly_ngn:  countryInfo.ngn,
      })
      .select("id")
      .single();

    if (dbErr || !numRow) return { error: true, message: "Failed to create record" } as const;

    const ok = await debitWallet({
      userId,
      amountNgn:   countryInfo.ngn,
      phoneNumber: data.phoneNumber,
    });
    if (!ok) {
      await supabaseAdmin.from("virtual_numbers").delete().eq("id", numRow.id);
      return { error: true, message: "Insufficient wallet balance" } as const;
    }

    try {
      await activateVirtualNumber({
        numberId:    numRow.id,
        phoneNumber: data.phoneNumber,
        userId,
        provider:    "wallet",
        reference:   `wallet_${numRow.id}`,
        amount:      countryInfo.ngn,
      });
      return { success: true } as const;
    } catch (e: unknown) {
      // Refund on Telnyx failure
      const { creditWallet } = await import("@/lib/wallet.server");
      await creditWallet({
        userId,
        amountNgn:   countryInfo.ngn,
        type:        "refund",
        description: `Refund: failed number provision ${data.phoneNumber}`,
      });
      await supabaseAdmin.from("virtual_numbers").delete().eq("id", numRow.id);
      const msg = e instanceof Error ? e.message : "Telnyx error";
      return { error: true, message: msg } as const;
    }
  });

// ── Request SMSPool temp number (from wallet) ─────────────────────────────────

const smsPoolRequestSchema = z.object({
  country: z.string().min(1).max(10),
  service: z.string().min(1).max(50).default("any"),
});

export const requestTempNumber = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => smsPoolRequestSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { SMSPOOL_APPROX_PRICE_NGN } = await import("@/lib/numbers");

    const { debitWallet }            = await import("@/lib/wallet.server");
    const { activateSMSPoolNumber }  = await import("@/lib/numbers.server");

    // 1. Debit wallet first
    const ok = await debitWallet({
      userId,
      amountNgn:   SMSPOOL_APPROX_PRICE_NGN,
      phoneNumber: `SMSPool/${data.country}/${data.service}`,
    });
    if (!ok) return { error: true, message: "Insufficient wallet balance" } as const;

    // 2. Create pending DB record
    const pendingSid = `smspool_pending_${Date.now()}`;
    const { data: numRow, error: dbErr } = await supabaseAdmin
      .from("virtual_numbers")
      .insert({
        user_id:      userId,
        twilio_sid:   pendingSid,
        phone_number: "pending",
        country_code: data.country.toUpperCase().slice(0, 2),
        provider:     "smspool",
        status:       "pending_payment",
        monthly_usd:  0,
        monthly_ngn:  SMSPOOL_APPROX_PRICE_NGN,
      })
      .select("id")
      .single();

    if (dbErr || !numRow) {
      // Refund on DB failure
      const { creditWallet } = await import("@/lib/wallet.server");
      await creditWallet({
        userId,
        amountNgn:   SMSPOOL_APPROX_PRICE_NGN,
        type:        "refund",
        description: "Refund: failed to create SMSPool record",
      });
      return { error: true, message: "Database error" } as const;
    }

    // 3. Request number from SMSPool
    try {
      const result = await requestSMSPoolNumber(data.country, data.service);

      // Update phone_number in DB
      await supabaseAdmin
        .from("virtual_numbers")
        .update({ phone_number: result.phoneNumber })
        .eq("id", numRow.id);

      await activateSMSPoolNumber({
        numberId:    numRow.id,
        orderId:     result.orderId,
        phoneNumber: result.phoneNumber,
        userId,
      });

      return {
        success: true,
        numberId:    numRow.id,
        orderId:     result.orderId,
        phoneNumber: result.phoneNumber,
      } as const;
    } catch (e: unknown) {
      // Refund on SMSPool failure
      const { creditWallet } = await import("@/lib/wallet.server");
      await creditWallet({
        userId,
        amountNgn:   SMSPOOL_APPROX_PRICE_NGN,
        type:        "refund",
        description: `Refund: SMSPool request failed`,
      });
      await supabaseAdmin.from("virtual_numbers").delete().eq("id", numRow.id);
      const msg = e instanceof Error ? e.message : "SMSPool error";
      return { error: true, message: msg } as const;
    }
  });

// ── Poll a SMSPool number for incoming SMS ────────────────────────────────────

export const pollTempNumber = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ numberId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context;

    const { data: num } = await supabaseAdmin
      .from("virtual_numbers")
      .select("id, provider_sid, twilio_sid, phone_number, status")
      .eq("id", data.numberId)
      .eq("user_id", userId)
      .eq("provider", "smspool")
      .single();

    if (!num) return { error: "Not found" } as const;
    if (num.status === "expired" || num.status === "released") {
      return { status: "expired" } as const;
    }

    const orderId = num.provider_sid ?? num.twilio_sid;
    if (!orderId || orderId.startsWith("pending_") || orderId.startsWith("smspool_pending_")) {
      return { status: "waiting" } as const;
    }

    const smsText = await pollSMSPoolInbox(orderId);

    if (smsText) {
      // Store in DB (realtime will push to client)
      await supabaseAdmin.from("sms_messages").insert({
        number_id:    num.id,
        user_id:      userId,
        provider:     "smspool",
        provider_sid: orderId,
        direction:    "inbound",
        from_number:  "SMSPool",
        to_number:    num.phone_number,
        body:         smsText,
        status:       "received",
      });

      // Mark number as expired after receiving
      await supabaseAdmin
        .from("virtual_numbers")
        .update({ status: "expired" })
        .eq("id", num.id)
        .eq("user_id", userId);

      return { status: "received", sms: smsText } as const;
    }

    return { status: "waiting" } as const;
  });
