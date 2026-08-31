import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// ── Record referral on signup ──────────────────────────────────────────────
// Called after onboarding when a user signs up via a referral link.
// Creates the referrals row; credits are only awarded later on first purchase.
export const processReferral = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ ref_code: z.string().min(4).max(16) }).parse(data))
  .handler(async ({ data, context }) => {
    const refereeId = context.userId;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const admin = supabaseAdmin as any;

    // Look up referrer by their referral_code column
    const { data: referrer } = await admin
      .from("profiles")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .select("id" as any)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .eq("referral_code" as any, data.ref_code.toLowerCase())
      .maybeSingle();

    const referrerId = (referrer as { id?: string } | null)?.id;
    if (!referrerId || referrerId === refereeId) return { success: false } as const;

    // Avoid duplicate records
    const { data: existing } = await admin
      .from("referrals")
      .select("id")
      .eq("referee_id", refereeId)
      .maybeSingle();

    if (existing) return { success: false } as const;

    await admin.from("referrals").insert({
      referrer_id: referrerId,
      referee_id: refereeId,
      credited: false,
    });

    return { success: true } as const;
  });

// ── Delete Account ─────────────────────────────────────────────────────────
export const deleteAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const userId = context.userId;
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) return { error: "delete_failed", message: error.message } as const;
    return { success: true } as const;
  });

// ── Update Profile Name ────────────────────────────────────────────────────
const updateNameSchema = z.object({ full_name: z.string().min(1).max(120) });

export const updateProfileName = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => updateNameSchema.parse(data))
  .handler(async ({ data, context }) => {
    const userId = context.userId;
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ full_name: data.full_name })
      .eq("id", userId);
    if (error) return { error: "update_failed", message: error.message } as const;
    return { success: true } as const;
  });

// ── Change Password ────────────────────────────────────────────────────────
const changePasswordSchema = z.object({ password: z.string().min(6).max(72) });

export const changePassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => changePasswordSchema.parse(data))
  .handler(async ({ data, context }) => {
    const userId = context.userId;
    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: data.password,
    });
    if (error) return { error: "change_failed", message: error.message } as const;
    return { success: true } as const;
  });
