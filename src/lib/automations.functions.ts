import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const db = supabaseAdmin as any;

export type AutomationType =
  | "channel_monitor"
  | "video_ideas"
  | "research"
  | "content";

export type AutomationFrequency = "daily" | "weekly" | "monthly";

export interface StudioAutomation {
  id: string;
  user_id: string;
  name: string;
  type: AutomationType;
  description: string | null;
  channel_url: string | null;
  topic: string | null;
  frequency: AutomationFrequency;
  enabled: boolean;
  last_run_at: string | null;
  next_run_at: string | null;
  created_at: string;
  updated_at: string;
}

const automationTypeSchema = z.enum([
  "channel_monitor",
  "video_ideas",
  "research",
  "content",
]);

const frequencySchema = z.enum(["daily", "weekly", "monthly"]);

const createAutomationSchema = z.object({
  name: z.string().min(1).max(120),
  type: automationTypeSchema,
  description: z.string().max(500).optional(),
  channel_url: z.string().max(500).optional(),
  topic: z.string().max(500).optional(),
  frequency: frequencySchema,
  enabled: z.boolean().optional().default(true),
});

const updateAutomationSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(120).optional(),
  description: z.string().max(500).nullable().optional(),
  channel_url: z.string().max(500).nullable().optional(),
  topic: z.string().max(500).nullable().optional(),
  frequency: frequencySchema.optional(),
  enabled: z.boolean().optional(),
  next_run_at: z.string().datetime().nullable().optional(),
});

function getNextRun(frequency: AutomationFrequency): string {
  const date = new Date();

  if (frequency === "daily") {
    date.setDate(date.getDate() + 1);
  } else if (frequency === "weekly") {
    date.setDate(date.getDate() + 7);
  } else {
    date.setMonth(date.getMonth() + 1);
  }

  return date.toISOString();
}

/**
 * List all automations belonging to the authenticated user.
 */
export const listStudioAutomations = createServerFn({
  method: "GET",
})
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await db
      .from("studio_automations")
      .select("*")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("List automations failed:", error);

      return {
        error: error.message,
        automations: [] as StudioAutomation[],
      } as const;
    }

    return {
      automations: (data ?? []) as StudioAutomation[],
    } as const;
  });

/**
 * Get one automation.
 */
export const getStudioAutomation = createServerFn({
  method: "GET",
})
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        id: z.string().uuid(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { data: automation, error } = await db
      .from("studio_automations")
      .select("*")
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .single();

    if (error || !automation) {
      return {
        error: "Automation not found.",
      } as const;
    }

    return {
      automation: automation as StudioAutomation,
    } as const;
  });

/**
 * Create an automation.
 */
export const createStudioAutomation = createServerFn({
  method: "POST",
})
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => createAutomationSchema.parse(data))
  .handler(async ({ data, context }) => {
    const nextRunAt = data.enabled
      ? getNextRun(data.frequency)
      : null;

    const { data: automation, error } = await db
      .from("studio_automations")
      .insert({
        user_id: context.userId,
        name: data.name.trim(),
        type: data.type,
        description: data.description?.trim() || null,
        channel_url: data.channel_url?.trim() || null,
        topic: data.topic?.trim() || null,
        frequency: data.frequency,
        enabled: data.enabled,
        next_run_at: nextRunAt,
      })
      .select("*")
      .single();

    if (error) {
      console.error("Create automation failed:", error);

      return {
        error: error.message,
      } as const;
    }

    return {
      automation: automation as StudioAutomation,
    } as const;
  });

/**
 * Update an automation.
 */
export const updateStudioAutomation = createServerFn({
  method: "POST",
})
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => updateAutomationSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { id, ...fields } = data;

    const { data: existing } = await db
      .from("studio_automations")
      .select("*")
      .eq("id", id)
      .eq("user_id", context.userId)
      .single();

    if (!existing) {
      return {
        error: "Automation not found.",
      } as const;
    }

    const updates: Record<string, unknown> = {
      ...fields,
      updated_at: new Date().toISOString(),
    };

    if (fields.frequency && fields.frequency !== existing.frequency) {
      updates.next_run_at = existing.enabled
        ? getNextRun(fields.frequency)
        : null;
    }

    if (fields.enabled === false) {
      updates.next_run_at = null;
    }

    if (fields.enabled === true && !existing.enabled) {
      updates.next_run_at = getNextRun(
        fields.frequency ?? existing.frequency,
      );
    }

    const { data: automation, error } = await db
      .from("studio_automations")
      .update(updates)
      .eq("id", id)
      .eq("user_id", context.userId)
      .select("*")
      .single();

    if (error) {
      console.error("Update automation failed:", error);

      return {
        error: error.message,
      } as const;
    }

    return {
      automation: automation as StudioAutomation,
    } as const;
  });

/**
 * Enable / disable an automation.
 */
export const toggleStudioAutomation = createServerFn({
  method: "POST",
})
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data) =>
      z
        .object({
          id: z.string().uuid(),
          enabled: z.boolean(),
        })
        .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { data: existing } = await db
      .from("studio_automations")
      .select("frequency")
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .single();

    if (!existing) {
      return {
        error: "Automation not found.",
      } as const;
    }

    const nextRunAt = data.enabled
      ? getNextRun(existing.frequency)
      : null;

    const { data: automation, error } = await db
      .from("studio_automations")
      .update({
        enabled: data.enabled,
        next_run_at: nextRunAt,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .select("*")
      .single();

    if (error) {
      return {
        error: error.message,
      } as const;
    }

    return {
      automation: automation as StudioAutomation,
    } as const;
  });

/**
 * Delete an automation.
 */
export const deleteStudioAutomation = createServerFn({
  method: "POST",
})
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data) =>
      z
        .object({
          id: z.string().uuid(),
        })
        .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { error } = await db
      .from("studio_automations")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);

    if (error) {
      return {
        error: error.message,
      } as const;
    }

    return {
      success: true,
    } as const;
  });

/**
 * Mark an automation as having run.
 *
 * The actual AI/YouTube work can be connected to this from
 * a scheduled worker/cron endpoint.
 */
export const markAutomationRun = createServerFn({
  method: "POST",
})
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data) =>
      z
        .object({
          id: z.string().uuid(),
        })
        .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { data: existing } = await db
      .from("studio_automations")
      .select("frequency,enabled")
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .single();

    if (!existing) {
      return {
        error: "Automation not found.",
      } as const;
    }

    const now = new Date().toISOString();

    const nextRunAt = existing.enabled
      ? getNextRun(existing.frequency)
      : null;

    const { data: automation, error } = await db
      .from("studio_automations")
      .update({
        last_run_at: now,
        next_run_at: nextRunAt,
        updated_at: now,
      })
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .select("*")
      .single();

    if (error) {
      return {
        error: error.message,
      } as const;
    }

    return {
      automation: automation as StudioAutomation,
    } as const;
  });
