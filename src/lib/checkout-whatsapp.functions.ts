import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { whatsappConfigured } from "@/lib/whatsapp.server";

const inputSchema = z.object({
  phone: z.string().trim().min(7).max(32),
});

export const getCheckoutWhatsAppAvailability = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => ({ available: whatsappConfigured() }));

function normalizeWhatsAppPhone(input: string) {
  const compact = input.replace(/[\s().-]/g, "");
  let digits = compact.replace(/^\+/, "");
  // Nigerian local mobile numbers are the expected conversion-funnel default.
  if (/^0\d{10}$/.test(digits)) digits = `234${digits.slice(1)}`;
  if (!/^\d{8,15}$/.test(digits) || digits.startsWith("0")) return null;
  return `+${digits}`;
}

export const saveCheckoutWhatsAppOptIn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => inputSchema.parse(data))
  .handler(async ({ data, context }) => {
    const phone = normalizeWhatsAppPhone(data.phone);
    if (!phone) return { error: true, message: "Enter a valid WhatsApp number, including country code." } as const;

    const now = new Date().toISOString();
    const { error } = await (supabaseAdmin as any)
      .from("checkout_whatsapp_opt_ins")
      .upsert({
        user_id: context.userId,
        phone_e164: phone,
        opted_in_at: now,
        opted_out_at: null,
        updated_at: now,
      }, { onConflict: "user_id" });
    if (error) throw new Error(error.message);
    return { ok: true, phone } as const;
  });

export const optOutOfCheckoutWhatsApp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { error } = await (supabaseAdmin as any)
      .from("checkout_whatsapp_opt_ins")
      .update({ opted_out_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true } as const;
  });
