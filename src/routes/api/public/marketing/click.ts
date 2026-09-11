import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import {
  PLAN_ACTIVATION_CAMPAIGNS,
  verifyMarketingCampaignToken,
} from "@/lib/email.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const clickSchema = z.object({
  user: z.string().uuid(),
  campaign: z.enum(PLAN_ACTIVATION_CAMPAIGNS),
  token: z.string().length(64),
});

export const Route = createFileRoute("/api/public/marketing/click")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const parsed = clickSchema.safeParse({
          user: url.searchParams.get("user"),
          campaign: url.searchParams.get("campaign"),
          token: url.searchParams.get("token"),
        });

        if (parsed.success && verifyMarketingCampaignToken(parsed.data.user, parsed.data.campaign, parsed.data.token)) {
          const { error } = await supabaseAdmin
            .from("marketing_campaign_sends")
            .update({ clicked_at: new Date().toISOString() })
            .eq("user_id", parsed.data.user)
            .eq("campaign_key", parsed.data.campaign)
            .is("clicked_at", null);

          if (error) console.error("Unable to record marketing campaign click:", error.message);
        }

        return Response.redirect(new URL("/choose-plan", url.origin), 302);
      },
    },
  },
});
