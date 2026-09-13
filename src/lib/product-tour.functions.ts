import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const stateSchema = z.object({
  state: z.enum(["not_started", "in_progress", "completed", "skipped"]),
});

export const saveProductTourState = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => stateSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ product_tour_state: data.state, product_tour_updated_at: new Date().toISOString() })
      .eq("id", context.userId);
    if (error) return { error: "save_failed" } as const;
    return { ok: true } as const;
  });
