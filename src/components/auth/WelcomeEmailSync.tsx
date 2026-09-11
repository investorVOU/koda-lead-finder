import {
  useEffect,
  useRef,
} from "react";

import {
  useServerFn,
} from "@tanstack/react-start";

import {
  useAuth,
} from "@/lib/auth";

import {
  sendGoogleSignupWelcomeEmail,
} from "@/lib/welcome-email.functions";

export function WelcomeEmailSync() {
  const {
    user,
    loading,
  } =
    useAuth();

  const sendGoogleWelcome =
    useServerFn(
      sendGoogleSignupWelcomeEmail,
    );

  const attemptedUsers =
    useRef<
      Set<string>
    >(new Set());

  useEffect(() => {
    if (
      loading ||
      !user
    ) {
      return;
    }

    if (
      attemptedUsers.current.has(
        user.id,
      )
    ) {
      return;
    }

    const primaryProvider =
      typeof user
        .app_metadata
        ?.provider ===
      "string"
        ? user
            .app_metadata
            .provider
        : null;

    const hasGoogleIdentity =
      user.identities?.some(
        (identity) =>
          identity.provider ===
          "google",
      ) ?? false;

    if (
      primaryProvider !==
        "google" &&
      !hasGoogleIdentity
    ) {
      return;
    }

    attemptedUsers.current.add(
      user.id,
    );

    let cancelled =
      false;

    async function sync() {
      try {
        await sendGoogleWelcome();
      } catch (error) {
        if (
          !cancelled
        ) {
          console.error(
            "Unable to process Google signup welcome email:",
            error,
          );
        }
      }
    }

    sync();

    return () => {
      cancelled = true;
    };
  }, [
    loading,
    user,
    sendGoogleWelcome,
  ]);

  return null;
}
