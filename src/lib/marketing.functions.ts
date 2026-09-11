import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const getMarketingEmailPreference = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("marketing_email_opt_in")
      .eq("id", context.userId)
      .single();
    if (error) return { error: error.message } as const;
    return { marketingOptIn: Boolean((data as { marketing_email_opt_in?: boolean }).marketing_email_opt_in) } as const;
  });

export const updateMarketingEmailPreference = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ marketingOptIn: z.boolean() }).parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({
        marketing_email_opt_in: data.marketingOptIn,
        marketing_email_opted_in_at: data.marketingOptIn ? new Date().toISOString() : null,
        marketing_email_unsubscribed_at: data.marketingOptIn ? null : new Date().toISOString(),
      })
      .eq("id", context.userId);
    if (error) return { error: error.message } as const;
    return { success: true } as const;
  });
