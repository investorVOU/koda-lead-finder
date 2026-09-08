/**
 * Extended server functions for the Numbers page features:
 *   Outbound SMS, auto-renew toggle, renewal, call forwarding,
 *   SMS templates, analytics, number labels, SMSPool ops, search, CSV export.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { NUMBER_COUNTRIES } from "@/lib/numbers";
import { calculateCustomerPrice } from "@/lib/pricing";
import { getSMSPoolRentals, purchaseSMSPoolRental, smsPoolKey } from "@/lib/services/phone-numbers";

// â”€â”€ Outbound SMS (Telnyx only) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const sendOutboundSMS = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        numberId: z.string().uuid(),
        to: z.string().min(7),
        body: z.string().min(1).max(1600),
      })
      .parse(d),
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
      return {
        error: true,
        message: "Outbound SMS is only available on Telnyx rental numbers",
      } as const;

    try {
      const { sendTelnyxSMS } = await import("@/lib/services/phone-numbers");
      const msgId = await sendTelnyxSMS(num.phone_number, data.to, data.body);

      await supabaseAdmin.from("sms_messages").insert({
        number_id: data.numberId,
        user_id: userId,
        provider: "telnyx",
        provider_sid: msgId,
        twilio_sid: null,
        direction: "outbound",
        from_number: num.phone_number,
        to_number: data.to,
        body: data.body,
        status: "sent",
      });

      return { success: true, messageId: msgId } as const;
    } catch (e: unknown) {
      return { error: true, message: e instanceof Error ? e.message : "Send failed" } as const;
    }
  });

// â”€â”€ Toggle auto-renew â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const toggleAutoRenew = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        numberId: z.string().uuid(),
        autoRenew: z.boolean(),
      })
      .parse(d),
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

// â”€â”€ Extend number by 1 month (wallet debit + Telnyx renewal) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const extendNumber = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ numberId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context;

    const { data: num } = await supabaseAdmin
      .from("virtual_numbers")
      .select(
        "phone_number, provider, provider_sid, twilio_sid, monthly_ngn, monthly_usd, country_code, expires_at",
      )
      .eq("id", data.numberId)
      .eq("user_id", userId)
      .single();

    if (!num) return { error: true, message: "Number not found" } as const;
    if (num.provider !== "telnyx")
      return { error: true, message: "Only Telnyx numbers can be manually extended" } as const;

    const { debitWallet } = await import("@/lib/wallet.server");
    const ok = await debitWallet({
      userId,
      amountNgn: num.monthly_ngn,
      phoneNumber: num.phone_number,
    });
    if (!ok) return { error: true, message: "Insufficient wallet balance" } as const;

    const currentExpiry = num.expires_at ? new Date(num.expires_at) : new Date();
    const newExpiry = new Date(
      Math.max(currentExpiry.getTime(), Date.now()) + 31 * 24 * 60 * 60 * 1000,
    );

    await supabaseAdmin
      .from("virtual_numbers")
      .update({ expires_at: newExpiry.toISOString(), status: "active" })
      .eq("id", data.numberId)
      .eq("user_id", userId);

    return { success: true, expiresAt: newExpiry.toISOString() } as const;
  });

// â”€â”€ Configure call forwarding â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

// E.164 phone format: +<country_code><number>, e.g. +14155552671
const e164Regex = /^\+[1-9]\d{6,14}$/;

export const setCallForward = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        numberId: z.string().uuid(),
        // Strict E.164 validation prevents premium-rate / SIP URI abuse
        forwardTo: z
          .string()
          .regex(e164Regex, "Must be a valid E.164 phone number (e.g. +14155552671)")
          .nullable(),
        enabled: z.boolean(),
      })
      .parse(d),
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
        call_forward_to: data.forwardTo,
        call_forward_enabled: data.enabled && !!data.forwardTo,
      })
      .eq("id", data.numberId)
      .eq("user_id", userId);

    // Tell Telnyx (best-effort â€” may fail if number not in Call Control mode)
    if (num.provider === "telnyx" && num.provider_sid) {
      try {
        const { configureTelnyxCallForward } = await import("@/lib/services/phone-numbers");
        await configureTelnyxCallForward(num.provider_sid, data.enabled ? data.forwardTo : null);
      } catch {
        console.warn("[numbers] call forwarding configuration failed");
      }
    }

    return { success: true } as const;
  });

// â”€â”€ Update number label â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const updateNumberLabel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        numberId: z.string().uuid(),
        label: z.string().max(50).nullable(),
      })
      .parse(d),
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

// â”€â”€ SMS Templates â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
    z
      .object({
        name: z.string().min(1).max(50),
        body: z.string().min(1).max(1600),
      })
      .parse(d),
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

// â”€â”€ Number analytics â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
    const inbound = msgs.filter((m) => m.direction !== "outbound");
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
    const last30 = inbound.filter((m) => m.received_at >= thirtyDaysAgo).length;

    return {
      totalInbound: inbound.length,
      totalOutbound: outbound.length,
      last30Days: last30,
      lastActivity: inbound[0]?.received_at ?? null,
      topSenders,
    } as const;
  });

// â”€â”€ Mark messages as read â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

// â”€â”€ Search messages â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const searchMessages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        query: z.string().min(1).max(200),
        numberId: z.string().uuid().optional(),
      })
      .parse(d),
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

// â”€â”€ Export all messages for a number as CSV data â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
    const header = "Date,Direction,From,To,Body,Status\n";
    const body = rows
      .map((m) =>
        [
          new Date(m.received_at).toISOString(),
          m.direction,
          m.from_number,
          m.to_number,
          `"${(m.body ?? "").replace(/"/g, '""')}"`,
          m.status,
        ].join(","),
      )
      .join("\n");

    return { csv: header + body } as const;
  });

// â”€â”€ SMSPool: List active temp orders â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const listSMSPoolOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    // Pull active SMSPool numbers from our own DB (not SMSPool API â€” more reliable)
    const { data, error } = await supabaseAdmin
      .from("virtual_numbers")
      .select(
        "id, phone_number, country_code, provider_sid, twilio_sid, status, expires_at, created_at",
      )
      .eq("user_id", userId)
      .eq("provider", "smspool")
      .neq("status", "released")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) return { error: true, message: error.message, orders: [] } as const;
    return { orders: data ?? [] } as const;
  });

// â”€â”€ SMSPool: Cancel temp order + refund wallet â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

    // Try to cancel on SMSPool (best-effort â€” may already be expired)
    if (orderId && !orderId.startsWith("smspool_pending_")) {
      try {
        const { cancelSMSPoolOrder } = await import("@/lib/services/phone-numbers");
        await cancelSMSPoolOrder(orderId);
      } catch {
        /* SMSPool may reject if already expired â€” still mark released */
      }
    }

    // Refund the actual amount debited. If the row has no recorded amount, do not invent a static price.
    const refundNgn = Number(num.monthly_ngn ?? 0);
    if (refundNgn > 0) {
      const { creditWallet } = await import("@/lib/wallet.server");
      await creditWallet({
        userId,
        amountNgn: refundNgn,
        type: "refund",
        description: "Refund: cancelled SMSPool order",
      });
    }

    await supabaseAdmin
      .from("virtual_numbers")
      .update({ status: "released" })
      .eq("id", data.numberId)
      .eq("user_id", userId);

    return { success: true } as const;
  });

// â”€â”€ SMSPool: Resend SMS request â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

// SMSPool: Buy rental number (multi-day)

const smsPoolRentalSchema = z.object({
  rentalId: z.string().min(1),
  country: z.string().min(1).max(50),
  service: z.string().min(1).max(50).default("any"),
  days: z.number().int().min(1).max(30),
});

type SMSPoolRentalApiItem = {
  ID?: number | string;
  name?: string;
  tag?: string;
  region?: string;
  country_short?: string;
  pricing?: Record<string, number | string>;
  priority?: number;
  pool?: number;
  single_service?: string | null;
  single_service_extend?: string | null;
  is_refundable?: number;
  refund_within?: number;
  refund_min_days?: number;
};

type SMSPoolRentalListResponse = {
  success?: number;
  message?: string;
  data?: SMSPoolRentalApiItem[];
};

type SMSPoolRentalPurchaseResponse = {
  success?: number;
  message?: string;
  phonenumber?: string;
  days?: number;
  rental_code?: string;
  expiry?: number;
};

function getSMSPoolApiKey(): string {
  const key = process.env.SMSPOOL_API_KEY ?? process.env.SMSPOOL_KEY;

  if (!key) {
    throw new Error("SMSPool API key is missing. Set SMSPOOL_API_KEY or SMSPOOL_KEY.");
  }

  return key;
}

function smsPoolRentalCountryMatches(
  requestedCountry: string,
  rental: SMSPoolRentalApiItem,
): boolean {
  const requested = requestedCountry
    .trim()
    .toUpperCase()
    .replace(/[^A-Z]/g, "");

  const shortCountry = String(rental.country_short ?? "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z]/g, "");

  if (shortCountry === requested) {
    return true;
  }

  const name = String(rental.name ?? "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z]/g, "");

  const tag = String(rental.tag ?? "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z]/g, "");

  const aliases: Record<string, string[]> = {
    US: ["US", "USA", "UNITEDSTATES", "UNITEDSTATESOFAMERICA"],
    USA: ["US", "USA", "UNITEDSTATES", "UNITEDSTATESOFAMERICA"],
    GB: ["GB", "UK", "UNITEDKINGDOM", "GREATBRITAIN"],
    UK: ["GB", "UK", "UNITEDKINGDOM", "GREATBRITAIN"],
    CA: ["CA", "CANADA"],
    AU: ["AU", "AUSTRALIA"],
    NZ: ["NZ", "NEWZEALAND"],
    RU: ["RU", "RUSSIA"],
    FR: ["FR", "FRANCE"],
    DE: ["DE", "GERMANY"],
    ES: ["ES", "SPAIN"],
    IT: ["IT", "ITALY"],
    IE: ["IE", "IRELAND"],
    NL: ["NL", "NETHERLANDS"],
    BE: ["BE", "BELGIUM"],
    CH: ["CH", "SWITZERLAND"],
    AT: ["AT", "AUSTRIA"],
    SE: ["SE", "SWEDEN"],
    NO: ["NO", "NORWAY"],
    DK: ["DK", "DENMARK"],
    FI: ["FI", "FINLAND"],
    PL: ["PL", "POLAND"],
    CZ: ["CZ", "CZECHREPUBLIC"],
    PT: ["PT", "PORTUGAL"],
    NG: ["NG", "NIGERIA"],
    ZA: ["ZA", "SOUTHAFRICA"],
    GH: ["GH", "GHANA"],
    KE: ["KE", "KENYA"],
    MX: ["MX", "MEXICO"],
    BR: ["BR", "BRAZIL"],
    AR: ["AR", "ARGENTINA"],
    IN: ["IN", "INDIA"],
    PK: ["PK", "PAKISTAN"],
    ID: ["ID", "INDONESIA"],
    MY: ["MY", "MALAYSIA"],
    SG: ["SG", "SINGAPORE"],
    TH: ["TH", "THAILAND"],
    PH: ["PH", "PHILIPPINES"],
    JP: ["JP", "JAPAN"],
    KR: ["KR", "SOUTHKOREA", "KOREA"],
    IL: ["IL", "ISRAEL"],
    TR: ["TR", "TURKEY"],
    AE: ["AE", "UNITEDARABEMIRATES", "UAE"],
    SA: ["SA", "SAUDIARABIA"],
    KZ: ["KZ", "KAZAKHSTAN"],
    KG: ["KG", "KYRGYZSTAN"],
    CY: ["CY", "CYPRUS"],
  };

  const accepted = aliases[requested] ?? [requested];

  return accepted.some(
    (alias) => name === alias || tag === alias || name.includes(alias) || tag.includes(alias),
  );
}

export const getSmsPoolRentalOptions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        country: z.string().min(1).max(50),
        type: z.union([z.literal(0), z.literal(1)]).default(0),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { country } = data;

    const baseUrl = process.env.SMSPOOL_BASE ?? "https://api.smspool.net";

    const endpoint = `${baseUrl}/rental/retrieve_all`;

    try {
      const fetchRentalType = async (type: 0 | 1) => {
        const body = new FormData();

        body.append("key", getSMSPoolApiKey());
        body.append("type", String(type));

        const response = await fetch(endpoint, {
          method: "POST",
          body,
        });

        const rawText = await response.text();

        let json: SMSPoolRentalListResponse | null = null;

        try {
          json = rawText ? (JSON.parse(rawText) as SMSPoolRentalListResponse) : null;
        } catch {
          return [];
        }

        /*
         * SMSPool may return an error/no-rentals response for
         * one type while the other type still has inventory.
         * Do not fail the entire request because of that.
         */
        if (!response.ok || !json || json.success !== 1 || !Array.isArray(json.data)) {
          return [];
        }

        return json.data;
      };

      // SMSPool uses type to separate extendable and non-extendable rental
      // catalogues. Keep those price schedules separate in the customer UI.
      const allRentals = await fetchRentalType(data.type);

      /*
       * Remove duplicate products.
       */
      const uniqueRentals = Array.from(
        new Map(
          allRentals.map((rental) => [
            String(rental.ID ?? "") + "|" + String(rental.tag ?? rental.name ?? ""),
            rental,
          ]),
        ).values(),
      );

      const matchingProducts = uniqueRentals.filter((rental) =>
        smsPoolRentalCountryMatches(country, rental),
      );

      const { getCachedFxRate } = await import("@/lib/wallet.server");
      const fxRate = await getCachedFxRate();

      const rentals = matchingProducts
        .map((item) => {
          const pricing: Record<
            string,
            {
              customerNgn: number;
              customerUsd: number;
            }
          > = {};

          for (const [days, rawPrice] of Object.entries(item.pricing ?? {})) {
            const parsedDays = Number(days);
            const parsedPrice = Number(rawPrice);

            if (
              Number.isInteger(parsedDays) &&
              parsedDays >= 1 &&
              parsedDays <= 30 &&
              Number.isFinite(parsedPrice) &&
              parsedPrice >= 0
            ) {
              const customerPrice = calculateCustomerPrice(parsedPrice, fxRate);
              pricing[String(parsedDays)] = {
                customerNgn: customerPrice.customerNgn,
                customerUsd: customerPrice.customerUsd,
              };
            }
          }

          return {
            rentalId: String(item.ID ?? ""),
            country,

            pricing,
          };
        })
        .filter((item) => item.rentalId.length > 0 && Object.keys(item.pricing).length > 0);

      if (rentals.length === 0) {
        return {
          error: true,
          message: "No flexible rentals are currently available for this country.",
          rentals: [],
        } as const;
      }

      return {
        success: true,
        rentals,
      } as const;
    } catch {
      console.error("[numbers] flexible rental lookup failed");

      return {
        error: true,
        message: "Unable to retrieve flexible rentals right now.",
        rentals: [],
      } as const;
    }
  });

export const buyRentalSMSPool = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => smsPoolRentalSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    let chargedAmountNgn: number | null = null;

    try {
      // Re-read the price catalogue on the server. The rental ID, duration, and any
      // price sent by the browser are never trusted for billing.
      const catalog = await getSMSPoolRentals(1);
      const rental = catalog.find(
        (item) =>
          item.rentalId === data.rentalId &&
          smsPoolRentalCountryMatches(data.country, {
            ID: item.rentalId,
            name: item.name,
            tag: item.tag,
            pricing: item.pricing,
          }),
      );
      const providerUsd = Number(rental?.pricing[String(data.days)]);

      if (!rental || !Number.isFinite(providerUsd) || providerUsd <= 0) {
        return {
          error: true,
          message: "This rental option is no longer available.",
        } as const;
      }

      const { getCachedFxRate, debitWallet } = await import("@/lib/wallet.server");
      const price = calculateCustomerPrice(providerUsd, await getCachedFxRate());
      const debited = await debitWallet({
        userId,
        amountNgn: price.customerNgn,
        phoneNumber: `Flexible rental/${data.country}`,
        description: `Flexible rental for ${data.days} day${data.days === 1 ? "" : "s"}`,
      });

      if (!debited) {
        return { error: true, message: "Insufficient wallet balance." } as const;
      }
      chargedAmountNgn = price.customerNgn;

      const result = await purchaseSMSPoolRental(data.rentalId, data.days, data.service);
      const expiresAt =
        result.expiresIn > 10_000_000
          ? new Date(result.expiresIn > 10_000_000_000 ? result.expiresIn : result.expiresIn * 1000)
          : new Date(Date.now() + Math.max(60, result.expiresIn) * 1000);

      const { error: numberError } = await supabaseAdmin.from("virtual_numbers").insert({
        user_id: userId,
        twilio_sid: result.orderId,
        provider_sid: result.orderId,
        provider: "smspool",
        phone_number: result.phoneNumber,
        friendly_name: result.phoneNumber,
        country_code: data.country.toUpperCase().slice(0, 2),
        number_type: "flexible rental",
        status: "active",
        monthly_usd: price.customerUsd,
        monthly_ngn: price.customerNgn,
        expires_at: expiresAt.toISOString(),
      });

      if (numberError) throw numberError;

      return {
        success: true,
        phoneNumber: result.phoneNumber,
        expiresIn: result.expiresIn,
      } as const;
    } catch {
      // A failed supplier request or persistence failure must never cost the customer funds.
      // Refund through the same wallet ledger used for all number purchases.
      try {
        if (chargedAmountNgn !== null) {
          const { creditWallet } = await import("@/lib/wallet.server");
          await creditWallet({
            userId,
            amountNgn: chargedAmountNgn,
            type: "refund",
            description: "Refund: flexible rental could not be issued",
          });
        }
      } catch {
        console.error("[numbers] flexible rental refund failed");
      }
      console.error("[numbers] flexible rental purchase failed");
      return {
        error: true,
        message: "This rental is currently unavailable. Please try another option.",
      } as const;
    }
  });
