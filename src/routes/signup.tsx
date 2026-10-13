import {
  createFileRoute,
  useNavigate,
} from "@tanstack/react-router";

import {
  useServerFn,
} from "@tanstack/react-start";

import {
  useEffect,
  useState,
  type FormEvent,
} from "react";

import {
  toast,
} from "sonner";

import {
  Loader2,
} from "lucide-react";

import {
  Button,
} from "@/components/ui/button";

import {
  Input,
} from "@/components/ui/input";

import {
  Label,
} from "@/components/ui/label";

import {
  AuthShell,
  GoogleButton,
} from "@/components/auth/AuthShell";
import { SupportChat } from "@/components/support/SupportChat";

import {
  supabase,
} from "@/integrations/supabase/client";

import {
  useAuth,
} from "@/lib/auth";

import {
  sendEmailSignupWelcomeEmail,
} from "@/lib/welcome-email.functions";

import {
  clearFunnelAttribution,
  markRegistrationTracked,
  readFunnelAttribution,
  trackSignupCompleted,
  trackSignupStarted,
  trackSignupSubmitted,
  type FunnelAttribution,
} from "@/lib/analytics";

export const Route =
  createFileRoute(
    "/signup",
  )({
    head: () => ({
      meta: [
        {
          title:
            "Create your account - Kodarai",
        },
      ],
    }),

    component:
      SignupPage,
  });

function SignupPage() {
  const navigate =
    useNavigate();

  const numbersSignup =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("next") === "numbers";

  const continueAfterSignup = () => {
    if (numbersSignup) {
      navigate({ to: "/numbers" });
      return;
    }
    navigate({ to: "/choose-plan" });
  };

  const {
    user,
    loading,
  } =
    useAuth();

  const sendWelcomeEmail =
    useServerFn(
      sendEmailSignupWelcomeEmail,
    );

  const [
    email,
    setEmail,
  ] =
    useState("");

  const [
    password,
    setPassword,
  ] =
    useState("");

  const [
    busy,
    setBusy,
  ] =
    useState(false);

  const [
    funnelData,
    setFunnelData,
  ] =
    useState<FunnelAttribution | null>(
      null,
    );

  useEffect(() => {
    const params =
      new URLSearchParams(
        window.location.search,
      );

    const ref =
      params.get(
        "ref",
      );

    if (ref) {
      try {
        localStorage.setItem(
          "kodarai_ref",
          ref,
        );
      } catch {
        // Storage errors must not break signup.
      }
    }

    try {
      const stored = readFunnelAttribution();

      setFunnelData(stored);
    } catch {
      setFunnelData(
        null,
      );
    }
  }, []);

  useEffect(() => {
    if (funnelData?.source === "ads") {
      trackSignupStarted(funnelData);
    }
  }, [funnelData]);

  useEffect(() => {
    if (
      !loading &&
      user
    ) {
      continueAfterSignup();
    }
  }, [
    user,
    loading,
    navigate,
  ]);

  const handleSignup =
    async (
      event:
        FormEvent,
    ) => {
      event.preventDefault();

      if (
        password.length <
        6
      ) {
        toast.error(
          "Password must be at least 6 characters",
        );

        return;
      }

      setBusy(true);

      const metadata = {
        ...(funnelData?.source
          ? {
              acquisition_source:
                funnelData.source,
            }
          : {}),

        ...(funnelData?.experience
          ? {
              onboarding_experience:
                funnelData.experience,
            }
          : {}),

        ...(funnelData?.goal
          ? {
              onboarding_income_goal:
                funnelData.goal,
            }
          : {}),

        ...(funnelData?.situation
          ? {
              onboarding_situation:
                funnelData.situation,
            }
          : {}),

        ...(funnelData?.utm_source
          ? {
              utm_source:
                funnelData.utm_source,
            }
          : {}),

        ...(funnelData?.utm_medium
          ? {
              utm_medium:
                funnelData.utm_medium,
            }
          : {}),

        ...(funnelData?.utm_campaign
          ? {
              utm_campaign:
                funnelData.utm_campaign,
            }
          : {}),

        ...(funnelData?.utm_content
          ? {
              utm_content:
                funnelData.utm_content,
            }
          : {}),

        ...(funnelData?.utm_term
          ? {
              utm_term:
                funnelData.utm_term,
            }
          : {}),
      };

      const {
        data,
        error,
      } =
        await supabase.auth.signUp(
          {
            email,
            password,

            options: {
              emailRedirectTo:
                window.location.origin +
                (numbersSignup ? "/numbers" : "/dashboard"),

              data:
                metadata,
            },
          },
        );

      if (error) {
        setBusy(
          false,
        );

        toast.error(
          error.message,
        );

        return;
      }

      /*
       * Only a successfully-created Supabase user
       * reaches this point.
       */
      if (
        data.user?.id
      ) {
        try {
          await sendWelcomeEmail(
            {
              data: {
                userId:
                  data
                    .user
                    .id,
              },
            },
          );
        } catch (error) {
          /*
           * Welcome email delivery must never
           * turn a successful account creation
           * into a failed registration.
           */
          console.error(
            "Welcome email could not be sent:",
            error,
          );
        }
      }

      if (data.user?.id) {
        trackSignupSubmitted(funnelData ?? undefined);
        trackSignupCompleted(funnelData ?? undefined);
        markRegistrationTracked(data.user.id);
        clearFunnelAttribution();
      }

      setBusy(false);

      if (
        data.session
      ) {
        toast.success(
          "Account created. Let's get started.",
        );

        continueAfterSignup();

        return;
      }

      toast.success(
        "Account created. Check your email to confirm your account.",
      );
    };

  const handleGoogle =
    async () => {
      setBusy(true);

      /*
       * Keep funnel data in localStorage.
       *
       * Google OAuth leaves Kodarai and comes
       * back later. The post-auth flow needs
       * this attribution after the redirect.
       */
      const {
        error,
      } =
        await supabase.auth.signInWithOAuth(
          {
            provider:
              "google",

            options: {
              redirectTo:
                window.location.origin +
                (numbersSignup ? "/numbers" : "/choose-plan"),
            },
          },
        );

      if (error) {
        setBusy(
          false,
        );

        toast.error(
          "Google sign-up failed. Please try again.",
        );
      }
    };

  return (
    <AuthShell
      title="Create your Kodarai account"
      subtitle={
        numbersSignup
          ? "Create your account to browse available virtual numbers and review the price before you buy."
          :
        "No coding needed. Create your account, see how to find your first website client, then choose the ₦1,000 Starter plan when you are ready."
      }
      footer={
        <>
          Already have an
          account?{" "}

          <a
            href={numbersSignup ? "/login?next=numbers" : "/login"}
            className="font-semibold text-primary hover:underline"
          >
            Sign in
          </a>
        </>
      }
    >
      <GoogleButton
        onClick={
          handleGoogle
        }
        loading={
          busy
        }
      />

      <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />

        or

        <span className="h-px flex-1 bg-border" />
      </div>

      <form
        onSubmit={
          handleSignup
        }
        className="space-y-4"
      >
        <div className="space-y-1.5">
          <Label htmlFor="email">
            Email
          </Label>

          <Input
            id="email"
            type="email"
            value={
              email
            }
            onChange={(
              event,
            ) =>
              setEmail(
                event
                  .target
                  .value,
              )
            }
            placeholder="you@example.com"
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password">
            Password
          </Label>

          <Input
            id="password"
            type="password"
            value={
              password
            }
            onChange={(
              event,
            ) =>
              setPassword(
                event
                  .target
                  .value,
              )
            }
            placeholder="At least 6 characters"
            minLength={
              6
            }
            required
          />
        </div>

        <Button
          type="submit"
          variant="hero"
          size="lg"
          className="w-full"
          disabled={
            busy
          }
        >
          {busy ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            numbersSignup ? "Create account & browse numbers" : "Create account — then see the ₦1,000 Starter"
          )}
        </Button>
        <p className="text-center text-xs leading-5 text-muted-foreground">
          {numbersSignup
            ? "No payment is taken on this page. You will review a number and its price before checkout."
            : "No payment is taken on this page. You will review the Starter plan before checkout."}
        </p>
      </form>
      <SupportChat />
    </AuthShell>
  );
}
