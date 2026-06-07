import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

function makeSlug() {
  return Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3);
}

export const createPromptPreview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        businessName: z.string().min(1).max(200),
        promptContent: z.string().min(1),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const slug = makeSlug();
    const { data: preview, error } = await supabaseAdmin
      .from("prompt_previews")
      .insert({
        user_id: context.userId,
        slug,
        business_name: data.businessName,
        prompt_content: data.promptContent,
      })
      .select("slug")
      .single();
    if (error) {
      return { error: "db_error", message: "Could not publish preview." } as const;
    }
    return { slug: preview.slug } as const;
  });

export const getPromptPreview = createServerFn({ method: "GET" })
  .inputValidator((data) => z.object({ slug: z.string().min(1) }).parse(data))
  .handler(async ({ data }) => {
    const { data: preview, error } = await supabaseAdmin
      .from("prompt_previews")
      .select("id, slug, business_name, prompt_content, views, created_at")
      .eq("slug", data.slug)
      .single();
    if (error || !preview) {
      return { error: "not_found" } as const;
    }
    return { preview } as const;
  });

export const trackPreviewView = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ slug: z.string().min(1) }).parse(data))
  .handler(async ({ data }) => {
    await supabaseAdmin.rpc("increment_preview_views", { p_slug: data.slug });
    return { ok: true } as const;
  });
