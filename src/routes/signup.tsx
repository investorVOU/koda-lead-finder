import {
  createFileRoute,
  Link,
  useNavigate,
} from "@tanstack/react-router";
import {
  useEffect,
  useState,
  type FormEvent,
} from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AuthShell,
  GoogleButton,
} from "@/components/auth/AuthShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

const FUNNEL_STORAGE_KEY = "kodarai_ad_funnel";

type FunnelData = {
  source?: string;

  experience?: string;
  goal?: string;
  situation?: string;

  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;

  created_at?: string;
};

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;

    ttq?: {
      track?: (
        event: string,
        properties?: Record<string, unknown>,
      ) => void;
    };
  }
}

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      {
        title: "Create your account - Kodarai",
      },
    ],
  }),

  component: SignupPage,
});

function SignupPage() {
  const navigate = useNavigate();

  const { user, loading } = useAuth();

  const [fullName, setFullName] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [busy, setBusy] =
    useState(false);

  const [
    marketingOptIn,
    setMarketingOptIn,
  ] = useState(false);

  const [
    funnelData,
    setFunnelData,
  ] = useState<FunnelData | null>(
    null,
  );

  useEffect(() => {
    const params =
      new URLSearchParams(
        window.location.search,
      );

    const ref = params.get("ref");

    if (ref) {
      localStorage.setItem(
        "kodarai_ref",
        ref,
      );
    }

    try {
      const stored =
        localStorage.getItem(
          FUNNEL_STORAGE_KEY,
        );

      if (stored) {
        const parsed =
          JSON.parse(stored) as FunnelData;

        setFunnelData(parsed);
      }
    } catch {
      setFunnelData(null);
    }
  }, []);

  useEffect(() => {
    if (!loading && user) {
      navigate({
        to: "/dashboard",
      });
    }
  }, [
    user,
    loading,
    navigate,
  ]);

  const trackRegistration = () => {
    try {
      window.fbq?.(
        "track",
        "CompleteRegistration",
        {
          content_name:
            "Kodarai Signup",
          source:
            funnelData?.source ??
            "direct",
        },
      );

      window.ttq?.track?.(
        "CompleteRegistration",
        {
          content_name:
            "Kodarai Signup",
          source:
            funnelData?.source ??
            "direct",
        },
      );
    } catch {
      // Tracking must never block signup.
    }
  };

  const clearCompletedFunnel = () => {
    try {
      localStorage.removeItem(
        FUNNEL_STORAGE_KEY,
      );
    } catch {
      // Ignore localStorage errors.
    }
  };

  const handleSignup = async (
    event: FormEvent,
  ) => {
    event.preventDefault();

    if (
      password.length < 6
    ) {
      toast.error(
        "Password must be at least 6 characters",
      );

      return;
    }

    setBusy(true);

    const metadata = {
      full_name:
        fullName,

      marketing_email_opt_in:
        marketingOptIn,

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
              window.location
                .origin +
              "/dashboard",

            data: metadata,
          },
        },
      );

    setBusy(false);

    if (error) {
      toast.error(
        error.message,
      );

      return;
    }

    trackRegistration();

    if (data.session) {
      clearCompletedFunnel();

      toast.success(
        "Account created. Let's get started.",
      );

      navigate({
        to: "/dashboard",
      });

      return;
    }

    toast.success(
      "Check your email to confirm your account.",
    );
  };

  const handleGoogle =
    async () => {
      setBusy(true);

      /*
       * Keep the funnel data in localStorage.
       *
       * Google OAuth leaves the website and
       * comes back later, so the dashboard/auth
       * callback can still read this data after
       * the user returns.
       */
      const { error } =
        await supabase.auth.signInWithOAuth(
          {
            provider: "google",

            options: {
              redirectTo:
                window.location
                  .origin +
                "/dashboard",
            },
          },
        );

      if (error) {
        setBusy(false);

        toast.error(
          "Google sign-up failed. Please try again.",
        );
      }
    };

  const fromAdFunnel =
    funnelData?.source ===
    "ads";

  return (
    <AuthShell
      title="Create your account"
      subtitle={
        fromAdFunnel
          ? "Create your free account and start looking for businesses you can sell to."
          : "Create your account, then choose the plan that fits your workflow."
      }
      footer={
        <>
          Already have an
          account?{" "}

          <Link
            to="/login"
            className="font-semibold text-primary hover:underline"
          >
            Sign in
          </Link>
        </>
      }
    >
      {fromAdFunnel && (
        <div className="mb-5 border-l-2 border-primary bg-primary/5 px-4 py-3">
          <p className="text-sm font-semibold">
            Your plan is ready.
          </p>

          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Create your account
            and start finding
            businesses you can
            build for and sell to.
          </p>
        </div>
      )}

      <GoogleButton
        onClick={
          handleGoogle
        }
        loading={busy}
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
          <Label htmlFor="name">
            Full name
          </Label>

          <Input
            id="name"
            value={
              fullName
            }
            onChange={(
              event,
            ) =>
              setFullName(
                event.target
                  .value,
              )
            }
            placeholder="Your name"
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email">
            Email
          </Label>

          <Input
            id="email"
            type="email"
            value={email}
            onChange={(
              event,
            ) =>
              setEmail(
                event.target
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
                event.target
                  .value,
              )
            }
            placeholder="At least 6 characters"
            minLength={6}
            required
          />
        </div>

        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-muted/30 p-3 text-sm">
          <input
            type="checkbox"
            checked={
              marketingOptIn
            }
            onChange={(
              event,
            ) =>
              setMarketingOptIn(
                event.target
                  .checked,
              )
            }
            className="mt-0.5 size-4 accent-primary"
          />

          <span>
            <span className="font-medium">
              Send me weekly
              lead ideas and
              KodarAI offers
            </span>

            <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">
              Optional. You can
              unsubscribe at any
              time from Settings
              or an email link.
            </span>
          </span>
        </label>

        <Button
          type="submit"
          variant="hero"
          size="lg"
          className="w-full"
          disabled={busy}
        >
          {busy ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            "Create free account"
          )}
        </Button>
      </form>
    </AuthShell>
  );
}
