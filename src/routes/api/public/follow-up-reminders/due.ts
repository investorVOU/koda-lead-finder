import { createFileRoute } from "@tanstack/react-router";
import { sendDueFollowUpNotifications } from "@/lib/follow-up-notifications.server";

export const Route = createFileRoute("/api/public/follow-up-reminders/due")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.FOLLOW_UP_REMINDER_CRON_SECRET;
        if (!secret) return new Response("Follow-up reminder scheduler is not configured", { status: 503 });
        if (request.headers.get("authorization") !== `Bearer ${secret}`) return new Response("Unauthorized", { status: 401 });
        try {
          return Response.json(await sendDueFollowUpNotifications());
        } catch (error) {
          console.error("Follow-up reminder job failed:", error);
          return new Response("Follow-up reminder job failed", { status: 500 });
        }
      },
    },
  },
});
