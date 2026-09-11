import {
  createServerFn,
} from "@tanstack/react-start";

import { z } from "zod";

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

import {
  sendWelcomeEmailForUser,
} from "@/lib/email.server";

const NEW_USER_WINDOW_MS =
  2 * 60 * 60 * 1000;

function isRecentlyCreated(
  createdAt:
    string | undefined,
) {
  if (!createdAt) {
    return false;
  }

  const created =
    new Date(
      createdAt,
    ).getTime();

  if (
    Number.isNaN(created)
  ) {
    return false;
  }

  const age =
    Date.now() -
    created;

  return (
    age >= 0 &&
    age <=
      NEW_USER_WINDOW_MS
  );
}

function getPrimaryProvider(
  user: {
    app_metadata?: {
      provider?: unknown;
      providers?: unknown;
    };

    identities?: Array<{
      provider?: string;
    }> | null;
  },
) {
  const provider =
    typeof user
      .app_metadata
      ?.provider ===
    "string"
      ? user.app_metadata
          .provider
      : null;

  if (provider) {
    return provider;
  }

  const identityProvider =
    user.identities?.[0]
      ?.provider;

  return (
    identityProvider ??
    null
  );
}

/**
 * Email/password registration can have a newly-created
 * Supabase user but no authenticated session yet when
 * email confirmation is enabled.
 *
 * Because this endpoint is not authenticated, it ONLY
 * operates on:
 *
 * - a valid UUID
 * - a real Supabase user
 * - an email-provider account
 * - an account created within the last 2 hours
 *
 * The actual recipient is loaded server-side from Supabase.
 * The browser never chooses an email recipient.
 */
export const sendEmailSignupWelcomeEmail =
  createServerFn({
    method: "POST",
  })
    .inputValidator(
      (data) =>
        z
          .object({
            userId:
              z
                .string()
                .uuid(),
          })
          .parse(data),
    )
    .handler(
      async ({
        data,
      }) => {
        const {
          data:
            userResult,
          error,
        } =
          await supabaseAdmin.auth.admin.getUserById(
            data.userId,
          );

        const user =
          userResult.user;

        if (
          error ||
          !user
        ) {
          return {
            sent: false,
            reason:
              "User was not found.",
          } as const;
        }

        if (
          !isRecentlyCreated(
            user.created_at,
          )
        ) {
          return {
            sent: false,
            reason:
              "Account is not a new registration.",
          } as const;
        }

        const provider =
          getPrimaryProvider(
            user,
          );

        if (
          provider !==
          "email"
        ) {
          return {
            sent: false,
            reason:
              "This registration did not use email and password.",
          } as const;
        }

        return await sendWelcomeEmailForUser(
          user.id,
          "email",
        );
      },
    );

/**
 * Runs after a Google OAuth redirect.
 *
 * This is authenticated and uses the server-side user ID
 * from the bearer token — the browser cannot select which
 * account receives the message.
 *
 * Existing Google users are ignored because only recently
 * created accounts qualify.
 */
export const sendGoogleSignupWelcomeEmail =
  createServerFn({
    method: "POST",
  })
    .middleware([
      requireSupabaseAuth,
    ])
    .handler(
      async ({
        context,
      }) => {
        const {
          data:
            userResult,
          error,
        } =
          await supabaseAdmin.auth.admin.getUserById(
            context.userId,
          );

        const user =
          userResult.user;

        if (
          error ||
          !user
        ) {
          return {
            sent: false,
            reason:
              "User was not found.",
          } as const;
        }

        if (
          !isRecentlyCreated(
            user.created_at,
          )
        ) {
          return {
            sent: false,
            skipped: true,
            reason:
              "This is an existing account.",
          } as const;
        }

        const provider =
          getPrimaryProvider(
            user,
          );

        if (
          provider !==
          "google"
        ) {
          return {
            sent: false,
            skipped: true,
            reason:
              "This account was not created with Google.",
          } as const;
        }

        return await sendWelcomeEmailForUser(
          user.id,
          "google",
        );
      },
    );
