import { createFileRoute } from "@tanstack/react-router";
import { processDueNumberRenewals, releaseExpiredNumbers } from "@/lib/number-renewal.server";

export const Route = createFileRoute("/api/public/numbers/renewals")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.NUMBER_RENEWAL_CRON_SECRET;
        if (!secret) return new Response("Number renewal scheduler is not configured", { status: 503 });
        if (request.headers.get("authorization") !== `Bearer ${secret}`) return new Response("Unauthorized", { status: 401 });

        try {
          const renewals = await processDueNumberRenewals();
          const expired = await releaseExpiredNumbers();
          return Response.json({ renewals, expired });
        } catch (error) {
          console.error("Number renewal job failed:", error);
          return new Response("Number renewal job failed", { status: 500 });
        }
      },
    },
  },
});
