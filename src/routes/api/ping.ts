import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/ping")({
  server: {
    handlers: {
      GET: async () =>
        new Response(JSON.stringify({ ok: true, ts: Date.now() }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
    },
  },
});
