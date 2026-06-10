/**
 * Extended server functions for the Numbers page features:
 *   Outbound SMS, auto-renew toggle, renewal, call forwarding,
 *   SMS templates, analytics, number labels, SMSPool ops, search, CSV export.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { NUMBER_COUNTRIES, SMSPOOL_APPROX_PRICE_NGN } from "@/lib/numbers";

// ── Outbound SMS (Telnyx only) ────────────────────────────────────────────────

export const sendOutboundSMS = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      numberId: z.string().uuid(),
      to:       z.string().min(7),
      body:     z.string().min(1).max(1600),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;

    const { data: num } = await supabaseAdmin
      .from("virtual_numbers")
      .select("phone_number, provider, status")
      .eq("id", data.numberId)
      .eq("user_id", userId)
      .single();

    if (!num || num.status !== "active")
      return { error: true, message: "Number not found or not active" } as const;
    if (num.provider !== "telnyx")
      return { error: true, message: "Outbound SMS is only available on Telnyx rental numbers" } as const;

    try {
      const { sendTelnyxSMS } = await import("@/lib/services/phone-numbers");
      const msgId = await sendTelnyxSMS(num.phone_number, data.to, data.body);

      await supabaseAdmin.from("sms_messages").insert({
        number_id:    data.numberId,
        user_id:      userId,
        provider:     "telnyx",
        provider_sid: msgId,
        twilio_sid:   null,
        direction:    "outbound",
        from_number:  num.phone_number,
        to_number:    data.to,
        body:         data.body,
        status:       "sent",
      });

      return { success: true, messageId: msgId } as const;
    } catch (e: unknown) {
      return { error: true, message: e instanceof Error ? e.message : "Send failed" } as const;
    }
  });

// ── Toggle auto-renew ─────────────────────────────────────────────────────────

export const toggleAutoRenew = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      numberId:   z.string().uuid(),
      autoRenew:  z.boolean(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { error } = await supabaseAdmin
      .from("virtual_numbers")
      .update({ auto_renew: data.autoRenew })
      .eq("id", data.numberId)
      .eq("user_id", userId);
    if (error) return { error: true, message: error.message } as const;
    return { success: true, autoRenew: data.autoRenew } as const;
  });

// ── Extend number by 1 month (wallet debit + Telnyx renewal) ─────────────────

export const extendNumber = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ numberId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context;

    const { data: num } = await supabaseAdmin
      .from("virtual_numbers")
      .select("phone_number, provider, provider_sid, twilio_sid, monthly_ngn, monthly_usd, country_code, expires_at")
      .eq("id", data.numberId)
      .eq("user_id", userId)
      .single();

    if (!num) return { error: true, message: "Number not found" } as const;
    if (num.provider !== "telnyx") return { error: true, message: "Only Telnyx numbers can be manually extended" } as const;

    const { debitWallet } = await import("@/lib/wallet.server");
    const ok = await debitWallet({
      userId,
      amountNgn: num.monthly_ngn,
      phoneNumber: num.phone_number,
    });
    if (!ok) return { error: true, message: "Insufficient wallet balance" } as const;

    const currentExpiry = num.expires_at ? new Date(num.expires_at) : new Date();
    const newExpiry = new Date(Math.max(currentExpiry.getTime(), Date.now()) + 31 * 24 * 60 * 60 * 1000);

    await supabaseAdmin
      .from("virtual_numbers")
      .update({ expires_at: newExpiry.toISOString(), status: "active" })
      .eq("id", data.numberId)
      .eq("user_id", userId);

    return { success: true, expiresAt: newExpiry.toISOString() } as const;
  });

// ── Configure call forwarding ─────────────────────────────────────────────────

// E.164 phone format: +<country_code><number>, e.g. +14155552671
const e164Regex = /^\+[1-9]\d{6,14}$/;

export const setCallForward = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      numberId:  z.string().uuid(),
      // Strict E.164 validation prevents premium-rate / SIP URI abuse
      forwardTo: z.string().regex(e164Regex, "Must be a valid E.164 phone number (e.g. +14155552671)").nullable(),
      enabled:   z.boolean(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;

    const { data: num } = await supabaseAdmin
      .from("virtual_numbers")
      .select("provider_sid, provider")
      .eq("id", data.numberId)
      .eq("user_id", userId)
      .single();

    if (!num) return { error: true, message: "Number not found" } as const;

    // Update DB first
    await supabaseAdmin
      .from("virtual_numbers")
      .update({
        call_forward_to:      data.forwardTo,
        call_forward_enabled: data.enabled && !!data.forwardTo,
      })
      .eq("id", data.numberId)
      .eq("user_id", userId);

    // Tell Telnyx (best-effort — may fail if number not in Call Control mode)
    if (num.provider === "telnyx" && num.provider_sid) {
      try {
        const { configureTelnyxCallForward } = await import("@/lib/services/phone-numbers");
        await configureTelnyxCallForward(num.provider_sid, data.enabled ? data.forwardTo : null);
      } catch (e) {
        console.warn("[callForward] Telnyx config error (non-fatal):", e);
      }
    }

    return { success: true } as const;
  });

// ── Update number label ───────────────────────────────────────────────────────

export const updateNumberLabel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      numberId: z.string().uuid(),
      label:    z.string().max(50).nullable(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { error } = await supabaseAdmin
      .from("virtual_numbers")
      .update({ label: data.label })
      .eq("id", data.numberId)
      .eq("user_id", userId);
    if (error) return { error: true, message: error.message } as const;
    return { success: true } as const;
  });

// ── SMS Templates ─────────────────────────────────────────────────────────────

export const getTemplates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { data, error } = await supabaseAdmin
      .from("sms_templates")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) return { error: true, message: error.message, templates: [] } as const;
    return { templates: data ?? [] } as const;
  });

export const createTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      name: z.string().min(1).max(50),
      body: z.string().min(1).max(1600),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { data: tpl, error } = await supabaseAdmin
      .from("sms_templates")
      .insert({ user_id: userId, name: data.name, body: data.body })
      .select("*")
      .single();
    if (error) return { error: true, message: error.message } as const;
    return { success: true, template: tpl } as const;
  });

export const deleteTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ templateId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    await supabaseAdmin
      .from("sms_templates")
      .delete()
      .eq("id", data.templateId)
      .eq("user_id", userId);
    return { success: true } as const;
  });

// ── Number analytics ──────────────────────────────────────────────────────────

export const getNumberAnalytics = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ numberId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context;

    const { data: messages, error } = await supabaseAdmin
      .from("sms_messages")
      .select("from_number, received_at, direction")
      .eq("number_id", data.numberId)
      .eq("user_id", userId)
      .order("received_at", { ascending: false });

    if (error) return { error: true, message: error.message } as const;

    const msgs = messages ?? [];
    const inbound  = msgs.filter((m) => m.direction !== "outbound");
    const outbound = msgs.filter((m) => m.direction === "outbound");

    // Sender frequency
    const freq: Record<string, number> = {};
    for (const m of inbound) freq[m.from_number] = (freq[m.from_number] ?? 0) + 1;
    const topSenders = Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([number, count]) => ({ number, count }));

    // 30-day count
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const last30        = inbound.filter((m) => m.received_at >= thirtyDaysAgo).length;

    return {
      totalInbound:  inbound.length,
      totalOutbound: outbound.length,
      last30Days:    last30,
      lastActivity:  inbound[0]?.received_at ?? null,
      topSenders,
    } as const;
  });

// ── Mark messages as read ─────────────────────────────────────────────────────

export const markMessagesRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ numberId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    await supabaseAdmin
      .from("sms_messages")
      .update({ is_read: true })
      .eq("number_id", data.numberId)
      .eq("user_id", userId)
      .eq("is_read", false);
    return { success: true } as const;
  });

// ── Search messages ───────────────────────────────────────────────────────────

export const searchMessages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      query:    z.string().min(1).max(200),
      numberId: z.string().uuid().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;

    let q = supabaseAdmin
      .from("sms_messages")
      .select("*, virtual_numbers(phone_number, country_code)")
      .eq("user_id", userId)
      .ilike("body", `%${data.query}%`)
      .order("received_at", { ascending: false })
      .limit(100);

    if (data.numberId) q = q.eq("number_id", data.numberId);

    const { data: msgs, error } = await q;
    if (error) return { error: true, message: error.message, messages: [] } as const;
    return { messages: msgs ?? [] } as const;
  });

// ── Export all messages for a number as CSV data ──────────────────────────────

export const exportMessages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ numberId: z.string().uuid().optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context;

    let q = supabaseAdmin
      .from("sms_messages")
      .select("received_at, direction, from_number, to_number, body, status, provider")
      .eq("user_id", userId)
      .order("received_at", { ascending: false })
      .limit(5000);

    if (data.numberId) q = q.eq("number_id", data.numberId);

    const { data: msgs, error } = await q;
    if (error) return { error: true, message: error.message, csv: "" } as const;

    const rows = msgs ?? [];
    const header = "Date,Direction,From,To,Body,Status,Provider\n";
    const body = rows
      .map((m) =>
        [
          new Date(m.received_at).toISOString(),
          m.direction,
          m.from_number,
          m.to_number,
          `"${(m.body ?? "").replace(/"/g, '""')}"`,
          m.status,
          m.provider,
        ].join(","),
      )
      .join("\n");

    return { csv: header + body } as const;
  });

// ── SMSPool: List active temp orders ─────────────────────────────────────────

export const listSMSPoolOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    // Pull active SMSPool numbers from our own DB (not SMSPool API — more reliable)
    const { data, error } = await supabaseAdmin
      .from("virtual_numbers")
      .select("id, phone_number, country_code, provider_sid, twilio_sid, status, expires_at, created_at")
      .eq("user_id", userId)
      .eq("provider", "smspool")
      .neq("status", "released")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) return { error: true, message: error.message, orders: [] } as const;
    return { orders: data ?? [] } as const;
  });

// ── SMSPool: Cancel temp order + refund wallet ────────────────────────────────

export const cancelSMSPoolTempOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ numberId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context;

    const { data: num } = await supabaseAdmin
      .from("virtual_numbers")
      .select("id, provider_sid, twilio_sid, monthly_ngn, status")
      .eq("id", data.numberId)
      .eq("user_id", userId)
      .eq("provider", "smspool")
      .single();

    if (!num) return { error: true, message: "Order not found" } as const;
    if (num.status === "expired" || num.status === "released")
      return { error: true, message: "Order is already closed" } as const;

    const orderId = num.provider_sid ?? num.twilio_sid;

    // Try to cancel on SMSPool (best-effort — may already be expired)
    if (orderId && !orderId.startsWith("smspool_pending_")) {
      try {
        const { cancelSMSPoolOrder } = await import("@/lib/services/phone-numbers");
        await cancelSMSPoolOrder(orderId);
      } catch { /* SMSPool may reject if already expired — still mark released */ }
    }

    // Refund the actual amount debited — not a hardcoded constant
    const refundNgn = (num.monthly_ngn && num.monthly_ngn > 0)
      ? num.monthly_ngn
      : SMSPOOL_APPROX_PRICE_NGN;
    const { creditWallet } = await import("@/lib/wallet.server");
    await creditWallet({
      userId,
      amountNgn:   refundNgn,
      type:        "refund",
      description: `Refund: cancelled SMSPool order`,
    });

    await supabaseAdmin
      .from("virtual_numbers")
      .update({ status: "released" })
      .eq("id", data.numberId)
      .eq("user_id", userId);

    return { success: true } as const;
  });

// ── SMSPool: Resend SMS request ───────────────────────────────────────────────

export const resendSMSPoolOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ numberId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context;

    const { data: num } = await supabaseAdmin
      .from("virtual_numbers")
      .select("provider_sid, twilio_sid")
      .eq("id", data.numberId)
      .eq("user_id", userId)
      .eq("provider", "smspool")
      .single();

    if (!num) return { error: true, message: "Order not found" } as const;

    const orderId = num.provider_sid ?? num.twilio_sid;
    if (!orderId || orderId.startsWith("smspool_pending_"))
      return { error: true, message: "No active order ID" } as const;

    try {
      const { resendSMSPoolSMS } = await import("@/lib/services/phone-numbers");
      await resendSMSPoolSMS(orderId);
      return { success: true } as const;
    } catch (e: unknown) {
      return { error: true, message: e instanceof Error ? e.message : "Resend failed" } as const;
    }
  });

// ── SMSPool: Buy rental number (multi-day) ────────────────────────────────────

const smsPoolRentalSchema = z.object({
  country: z.string().min(1).max(10),
  service: z.string().min(1).max(50).default("any"),
  days:    z.number().int().min(1).max(30).default(7),
});

export const buyRentalSMSPool = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => smsPoolRentalSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context;

    // Price: approximately $0.50-3/day; use $1/day as safe estimate.
    // Use live FX rate (not hardcoded) so the debit is accurate.
    const approxUsd = data.days * 1.0;
    const { getCachedFxRate } = await import("@/lib/wallet.server");
    const fxRate    = await getCachedFxRate();
    const approxNgn = Math.round(approxUsd * fxRate);

    const { debitWallet }           = await import("@/lib/wallet.server");
    const ok = await debitWallet({
      userId,
      amountNgn:   approxNgn,
      phoneNumber: `SMSPool-rental/${data.country}/${data.service}/${data.days}d`,
    });
    if (!ok) return { error: true, message: "Insufficient wallet balance" } as const;

    const pendingSid = `smspool_rental_${Date.now()}`;
    const { data: numRow, error: dbErr } = await supabaseAdmin
      .from("virtual_numbers")
      .insert({
        user_id:      userId,
        twilio_sid:   pendingSid,
        phone_number: "pending",
        country_code: data.country.toUpperCase().slice(0, 2),
        provider:     "smspool",
        status:       "pending_payment",
        monthly_usd:  approxUsd / data.days * 30,
        monthly_ngn:  approxNgn / data.days * 30,
      })
      .select("id")
      .single();

    if (dbErr || !numRow) {
      const { creditWallet } = await import("@/lib/wallet.server");
      await creditWallet({ userId, amountNgn: approxNgn, type: "refund", description: "Refund: SMSPool rental DB error" });
      return { error: true, message: "Database error" } as const;
    }

    try {
      const { purchaseSMSPoolRentalNumber } = await import("@/lib/services/phone-numbers");
      const result = await purchaseSMSPoolRentalNumber(data.country, data.service, data.days);

      await supabaseAdmin
        .from("virtual_numbers")
        .update({
          phone_number:  result.phoneNumber,
          provider_sid:  result.orderId,
          twilio_sid:    result.orderId,
          status:        "active",
          friendly_name: result.phoneNumber,
          expires_at:    new Date(Date.now() + result.expiresIn * 1000).toISOString(),
        })
        .eq("id", numRow.id);

      return {
        success: true,
        numberId:    numRow.id,
        phoneNumber: result.phoneNumber,
        orderId:     result.orderId,
        expiresAt:   new Date(Date.now() + result.expiresIn * 1000).toISOString(),
      } as const;
    } catch (e: unknown) {
      const { creditWallet } = await import("@/lib/wallet.server");
      await creditWallet({ userId, amountNgn: approxNgn, type: "refund", description: "Refund: SMSPool rental failed" });
      await supabaseAdmin.from("virtual_numbers").delete().eq("id", numRow.id);
      return { error: true, message: e instanceof Error ? e.message : "SMSPool rental failed" } as const;
    }
  });
