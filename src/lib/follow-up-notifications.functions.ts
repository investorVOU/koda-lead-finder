import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const pushSubscriptionSchema = z.object({
  endpoint: z.string().url().max(2000),
  p256dh: z.string().min(1).max(500),
  auth: z.string().min(1).max(500),
});

export const getFollowUpPushStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await supabaseAdmin
      .from("follow_up_push_subscriptions")
      .select("id")
      .eq("user_id", context.userId)
      .limit(1)
      .maybeSingle();
    if (error) return { error: error.message } as const;
    return { enabled: Boolean(data) } as const;
  });

export const getFollowUpPushConfig = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    if (!publicKey) return { error: "Browser notifications are not configured yet." } as const;
    return { publicKey } as const;
  });

export const saveFollowUpPushSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => pushSubscriptionSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await supabaseAdmin
      .from("follow_up_push_subscriptions")
      .upsert(
        { user_id: context.userId, ...data, updated_at: new Date().toISOString() },
        { onConflict: "endpoint" },
      );
    if (error) return { error: error.message } as const;
    return { success: true } as const;
  });
