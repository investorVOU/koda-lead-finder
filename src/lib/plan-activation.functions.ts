import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const recordPlanActivationEnrollment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await supabaseAdmin.auth.admin.getUserById(context.userId);
    if (error || data.user?.user_metadata?.acquisition_source !== "ads") return { enrolled: false } as const;

    const now = new Date().toISOString();
    const { error: enrollmentError } = await supabaseAdmin
      .from("plan_activation_enrollments")
      .upsert(
        { user_id: context.userId, first_choose_plan_at: now, last_choose_plan_at: now, acquisition_source: "ads" },
        { onConflict: "user_id", ignoreDuplicates: true },
      );

    if (enrollmentError) throw new Error(enrollmentError.message);
    return { enrolled: true } as const;
  });
