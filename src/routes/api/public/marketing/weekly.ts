import { createFileRoute } from "@tanstack/react-router";
import { sendWeeklyLeadMarketingCampaign } from "@/lib/marketing.server";

export const Route = createFileRoute("/api/public/marketing/weekly")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.MARKETING_CRON_SECRET;
        const authorization = request.headers.get("authorization");
        if (!secret) return new Response("Marketing scheduler is not configured", { status: 503 });
        if (authorization !== `Bearer ${secret}`) return new Response("Unauthorized", { status: 401 });
        try {
          return Response.json(await sendWeeklyLeadMarketingCampaign());
        } catch (error) {
          console.error("Weekly marketing campaign failed:", error);
          return new Response("Campaign failed", { status: 500 });
        }
      },
    },
  },
});
