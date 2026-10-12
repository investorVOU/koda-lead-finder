import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getPendingCheckoutForUser } from "@/lib/checkout-recovery.server";

/** Returns only the signed-in user's latest unfinished checkout, if it is still relevant. */
export const getPendingCheckout = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => getPendingCheckoutForUser(context.userId));
