import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { paystackFetch } from "@/lib/billing.server";
import { NUMBER_COUNTRIES } from "@/lib/numbers";
import { verifyHCaptcha } from "@/lib/hcaptcha.server";
import {
  searchTelnyxNumbers,
  requestSMSPoolNumber,
  pollSMSPoolInbox,
  getSMSPoolCountries,
  getSMSPoolServices,
  getSMSPoolPrice,
} from "@/lib/services/phone-numbers";

import { calculateCustomerPrice } from "@/lib/pricing";

// Derive redirect base URL server-side â€” never trust the client origin
function appUrl(): string {
  return process.env.APP_URL ?? "https://kodarai.xyz";
}

// â”€â”€ Search available Telnyx numbers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

export const getSmsPoolQuote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ country: z.string().min(1).max(10), service: z.string().min(1).max(50).default("any") }).parse(d))
  .handler(async ({ data }) => {
    const { getCachedFxRate } = await import("@/lib/wallet.server");
    const fxRate = await getCachedFxRate();
    const providerUsd = await getSMSPoolPrice(data.country, data.service);
    const price = calculateCustomerPrice(providerUsd, fxRate);
    return {
      providerUsd,
      quoteUsd: price.customerUsd,
      quoteNgn: price.customerNgn,
      usd: price.customerUsd,
      ngn: price.customerNgn,
    } as const;
  });

// â”€â”€ Initiate Telnyx number purchase (checkout session) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const purchaseSchema = z.object({
  phoneNumber:  z.string().min(7),
  country:      z.string().length(2),
  captchaToken: z.string().min(1).optional(),
  // Origin / price intentionally NOT accepted from client â€” derived server-side
});

export const initiateNumberPurchase = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => purchaseSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { userId, supabase } = context;

    if (data.captchaToken) {
      const ok = await verifyHCaptcha(data.captchaToken);
      if (!ok) return { error: true, message: "Captcha verification failed." } as const;
    }

    const { getCachedFxRate } = await import("@/lib/wallet.server");
    const fxRate = await getCachedFxRate();
    const liveNumbers = await searchTelnyxNumbers(data.country, ["sms"]);
    const inventoryMatch = liveNumbers.find((n) => n.phoneNumber === data.phoneNumber);
    if (!inventoryMatch) {
      return { error: true, message: `Number ${data.phoneNumber} is no longer available in ${data.country}.` } as const;
    }

    const price = calculateCustomerPrice(inventoryMatch.monthlyCostUsd, fxRate);

    const { data: userData } = await supabase.auth.getUser();
    const email = userData.user?.email ?? "";

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
        monthly_usd:  price.customerUsd,
        monthly_ngn:  price.customerNgn,
        expires_at:   new Date(Date.now() + 31 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select("id")
      .single();

    if (dbErr || !numRow) return { error: true, message: "Failed to create number record" } as const;

    const base = appUrl();
    const successUrl = `${base}/numbers?status=success`;

    if (!email) return { error: true, message: "Email required for Paystack" } as const;
    try {
      const ref = `num_${numRow.id}_${Date.now()}`;
      const res = await paystackFetch<{ data: { authorization_url: string } }>(
        "/transaction/initialize",
        "POST",
        {
          email,
          amount:       Math.round(price.customerNgn * 100),
          currency:     "NGN",
          reference:    ref,
          callback_url: successUrl,
          metadata: {
            user_id:      userId,
            kind:         "number_rental",
            number_id:    numRow.id,
            phone_number: data.phoneNumber,
            country:      data.country,
          },
        },
      );
      return { url: res.data.authorization_url } as const;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Paystack error";
      return { error: true, message: msg } as const;
    }
  });

// â”€â”€ List user's numbers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

// â”€â”€ Get all SMS messages (inbox view) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

// â”€â”€ Get SMS messages for a specific number â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

// â”€â”€ Release (delete) a Telnyx number â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
        // Don't fail â€” still mark as released in DB
      }
    }

    await supabaseAdmin
      .from("virtual_numbers")
      .update({ status: "released" })
      .eq("id", data.numberId)
      .eq("user_id", userId);

    return { success: true } as const;
  });

// â”€â”€ Buy Telnyx number from wallet balance â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const walletBuySchema = z.object({
  phoneNumber:  z.string().min(7),
  country:      z.string().length(2),
  captchaToken: z.string().min(1).optional(),
  // Price intentionally NOT accepted from client â€” looked up server-side
});

export const buyNumberFromWallet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => walletBuySchema.parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context;

    if (data.captchaToken) {
      const ok = await verifyHCaptcha(data.captchaToken);
      if (!ok) return { error: true, message: "Captcha verification failed." } as const;
    }

    const { getCachedFxRate } = await import("@/lib/wallet.server");
    const fxRate = await getCachedFxRate();
    const liveNumbers = await searchTelnyxNumbers(data.country, ["sms"]);
    const inventoryMatch = liveNumbers.find((n) => n.phoneNumber === data.phoneNumber);
    if (!inventoryMatch) {
      return { error: true, message: `Number ${data.phoneNumber} is no longer available in ${data.country}.` } as const;
    }

    const price = calculateCustomerPrice(inventoryMatch.monthlyCostUsd, fxRate);

    const { debitWallet } = await import("@/lib/wallet.server");
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
        monthly_usd:  price.customerUsd,
        monthly_ngn:  price.customerNgn,
      })
      .select("id")
      .single();

    if (dbErr || !numRow) return { error: true, message: "Failed to create record" } as const;

    const ok = await debitWallet({
      userId,
      amountNgn:   price.customerNgn,
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
        amount:      price.customerNgn,
      });
      return { success: true } as const;
    } catch (e: unknown) {
      const { creditWallet } = await import("@/lib/wallet.server");
      await creditWallet({
        userId,
        amountNgn:   price.customerNgn,
        type:        "refund",
        description: `Refund: failed number provision ${data.phoneNumber}`,
      });
      await supabaseAdmin.from("virtual_numbers").delete().eq("id", numRow.id);
      const msg = e instanceof Error ? e.message : "Telnyx error";
      return { error: true, message: msg } as const;
    }
  });

// â”€â”€ Request SMSPool temp number (from wallet) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const smsPoolRequestSchema = z.object({
  country: z.string().min(1).max(10),
  service: z.string().min(1).max(50).default("any"),
});

export const requestTempNumber = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => smsPoolRequestSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { getCachedFxRate } = await import("@/lib/wallet.server");
    const fxRate = await getCachedFxRate();
    const providerUsd = await getSMSPoolPrice(data.country, data.service);
    const price = calculateCustomerPrice(providerUsd, fxRate);

    const { debitWallet } = await import("@/lib/wallet.server");
    const { activateSMSPoolNumber } = await import("@/lib/numbers.server");

    const ok = await debitWallet({
      userId,
      amountNgn:   price.customerNgn,
      phoneNumber: `SMSPool/${data.country}/${data.service}`,
    });
    if (!ok) return { error: true, message: "Insufficient wallet balance" } as const;

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
        monthly_usd:  price.customerUsd,
        monthly_ngn:  price.customerNgn,
      })
      .select("id")
      .single();

    if (dbErr || !numRow) {
      const { creditWallet } = await import("@/lib/wallet.server");
      await creditWallet({
        userId,
        amountNgn:   price.customerNgn,
        type:        "refund",
        description: "Refund: failed to create SMSPool record",
      });
      return { error: true, message: "Database error" } as const;
    }

    try {
      const result = await requestSMSPoolNumber(data.country, data.service);
      await supabaseAdmin.from("virtual_numbers").update({ phone_number: result.phoneNumber }).eq("id", numRow.id);
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
      const { creditWallet } = await import("@/lib/wallet.server");
      await creditWallet({
        userId,
        amountNgn:   price.customerNgn,
        type:        "refund",
        description: "Refund: SMSPool request failed",
      });
      await supabaseAdmin.from("virtual_numbers").delete().eq("id", numRow.id);
      const msg = e instanceof Error ? e.message : "SMSPool error";
      return { error: true, message: msg } as const;
    }
  });

// â”€â”€ Poll a SMSPool number for incoming SMS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
      // Keep the temp number active until its expires_at countdown ends.

      return { status: "received", sms: smsText } as const;
    }

    return { status: "waiting" } as const;
  });

// â”€â”€ SMSPool country + service lists (for the temp number dialog) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const listSMSPoolCountries = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const countries = await getSMSPoolCountries();
    return { countries } as const;
  });

export const listSMSPoolServices = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const services = await getSMSPoolServices();
    return { services } as const;
  });

