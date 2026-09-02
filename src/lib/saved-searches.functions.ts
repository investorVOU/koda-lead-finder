import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { hasPlanAtLeast } from "@/lib/subscription.server";

const savedSearchSchema = z.object({
  category: z.string().trim().min(1).max(80),
  location: z.string().trim().min(1).max(120),
});

const idSchema = z.object({ id: z.string().uuid() });

export interface SavedSearch {
  id: string;
  name: string;
  category: string;
  location: string;
  last_run_at: string | null;
  created_at: string;
}

async function agencyRequired(userId: string) {
  return hasPlanAtLeast(userId, "agency");
}

export const listSavedSearches = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    if (!(await agencyRequired(context.userId))) {
      return { error: "plan_required", message: "Saved searches are available on the Agency plan." } as const;
    }

    const { data, error } = await supabaseAdmin
      .from("saved_searches")
      .select("id,name,category,location,last_run_at,created_at")
      .eq("user_id", context.userId)
      .order("updated_at", { ascending: false });
    if (error) return { error: "load_failed", message: "Could not load saved searches." } as const;

    return { searches: (data ?? []) as SavedSearch[] } as const;
  });

export const createSavedSearch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => savedSearchSchema.parse(data))
  .handler(async ({ data, context }) => {
    if (!(await agencyRequired(context.userId))) {
      return { error: "plan_required", message: "Saved searches are available on the Agency plan." } as const;
    }

    const name = `${data.category} in ${data.location}`.slice(0, 180);
    const { data: saved, error } = await supabaseAdmin
      .from("saved_searches")
      .insert({ user_id: context.userId, name, category: data.category, location: data.location })
      .select("id,name,category,location,last_run_at,created_at")
      .single();
    if (error) return { error: "save_failed", message: "Could not save this search." } as const;

    return { search: saved as SavedSearch } as const;
  });

export const deleteSavedSearch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => idSchema.parse(data))
  .handler(async ({ data, context }) => {
    if (!(await agencyRequired(context.userId))) {
      return { error: "plan_required", message: "Saved searches are available on the Agency plan." } as const;
    }

    const { error } = await supabaseAdmin
      .from("saved_searches")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) return { error: "delete_failed", message: "Could not delete this saved search." } as const;

    return { success: true } as const;
  });
