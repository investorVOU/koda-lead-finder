import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { recordVisitorEvent } from "@/lib/support-visitors.server";
import { VISITOR_EVENT_TYPES } from "@/lib/visitor-events";

const trackSchema = z.object({
  visitorToken: z.string().uuid(),
  event: z.enum(VISITOR_EVENT_TYPES),
  path: z.string().max(300),
  referrer: z.string().max(500).optional(),
  utm: z.object({
    source: z.string().max(100).optional(),
    medium: z.string().max(100).optional(),
    campaign: z.string().max(100).optional(),
  }).optional(),
});

/** Public, fire-and-forget. Always resolves ok so tracking can never break the page. */
export const trackVisitor = createServerFn({ method: "POST" })
  .inputValidator((data) => trackSchema.parse(data))
  .handler(async ({ data }) => {
    const userAgent = getRequest()?.headers.get("user-agent") ?? "";
    await recordVisitorEvent({ ...data, userAgent });
    return { ok: true } as const;
  });
