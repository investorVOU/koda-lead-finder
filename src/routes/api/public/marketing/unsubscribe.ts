import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { verifyMarketingUnsubscribeToken } from "@/lib/email.server";

const unsubscribeSchema = z.object({ user: z.string().uuid(), token: z.string().length(64) });

function page(message: string, status = 200) {
  return new Response(`<!doctype html><html lang="en"><body style="font-family:Arial,sans-serif;background:#f6f7f9;padding:48px;color:#18181b"><main style="max-width:520px;margin:auto;background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:32px"><h1 style="margin-top:0">KodarAI</h1><p>${message}</p></main></body></html>`, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

async function unsubscribe(request: Request) {
  const url = new URL(request.url);
  const parsed = unsubscribeSchema.safeParse({ user: url.searchParams.get("user"), token: url.searchParams.get("token") });
  if (!parsed.success || !verifyMarketingUnsubscribeToken(parsed.data.user, parsed.data.token)) return false;
  const { error } = await supabaseAdmin
    .from("profiles")
    .update({
      marketing_email_opt_in: false,
      marketing_email_opted_in_at: null,
      marketing_email_unsubscribed_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.user);
  return !error;
}

export const Route = createFileRoute("/api/public/marketing/unsubscribe")({
  server: {
    handlers: {
      GET: async ({ request }) => page((await unsubscribe(request)) ? "You have been unsubscribed from KodarAI marketing emails." : "This unsubscribe link is invalid or has expired.", 200),
      POST: async ({ request }) => (await unsubscribe(request))
        ? new Response(null, { status: 200 })
        : new Response(null, { status: 400 }),
    },
  },
});
