import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  claimUSNumberBonus,
  getEligibleUSNumberBonusOptions,
  getNumberBonusStatus,
} from "@/lib/number-bonus.server";

export const getMyNumberBonusStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => getNumberBonusStatus(context.userId));

export const getEligibleNumberBonusOptions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => getEligibleUSNumberBonusOptions(context.userId));

export const claimNumberBonus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({
    service: z.string().min(1).max(50),
  }).parse(data))
  .handler(async ({ data, context }) => claimUSNumberBonus({
    userId: context.userId,
    service: data.service,
  }));