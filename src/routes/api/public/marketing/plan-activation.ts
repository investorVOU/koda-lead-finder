import { createFileRoute } from "@tanstack/react-router";
import { sendPlanActivationCampaign } from "@/lib/plan-activation.server";

export const Route = createFileRoute("/api/public/marketing/plan-activation")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.MARKETING_CRON_SECRET;
        if (!secret) return new Response("Marketing scheduler is not configured", { status: 503 });
        if (request.headers.get("authorization") !== `Bearer ${secret}`) return new Response("Unauthorized", { status: 401 });

        try {
          return Response.json(await sendPlanActivationCampaign());
        } catch (error) {
          console.error("Plan activation campaign failed:", error);
          return new Response("Campaign failed", { status: 500 });
        }
      },
    },
  },
});
