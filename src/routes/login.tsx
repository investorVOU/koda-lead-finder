import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Loader2, KeyRound } from "lucide-react";
import HCaptcha from "@hcaptcha/react-hcaptcha";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthShell, GoogleButton } from "@/components/auth/AuthShell";
import { setRememberMe, supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

const HCAPTCHA_SITE_KEY = import.meta.env.VITE_HCAPTCHA_SITE_KEY as string;

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [{ title: "Sign in — Kodarai" }],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMeState] = useState(() =>
    typeof window === "undefined" || window.localStorage.getItem("kodarai.remember-me") !== "false",
  );
  const [busy, setBusy] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const captchaRef = useRef<HCaptcha>(null);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/dashboard" });
  }, [user, loading, navigate]);

  const resetCaptcha = () => {
    captchaRef.current?.resetCaptcha();
    setCaptchaToken(null);
  };

  const handlePassword = async (e: FormEvent) => {
    e.preventDefault();
    if (HCAPTCHA_SITE_KEY && !captchaToken) {
      toast.error("Please complete the captcha");
      return;
    }
    setRememberMe(rememberMe);
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
      options: captchaToken ? { captchaToken } : undefined,
    });
    setBusy(false);
    resetCaptcha();
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Welcome back!");
    navigate({ to: "/dashboard" });
  };

  const handleForgotPassword = async () => {
    if (!email) {
      toast.error("Enter your email first");
      return;
    }
    if (HCAPTCHA_SITE_KEY && !captchaToken) {
      toast.error("Please complete the captcha before requesting a password reset.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + "/reset-password",
      ...(captchaToken ? { captchaToken } : {}),
    });
    setBusy(false);
    resetCaptcha();
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Password reset email sent! Check your inbox.");
  };

  const handleGoogle = async () => {
    setRememberMe(rememberMe);
    setBusy(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin + "/dashboard" },
    });
    if (error) {
      setBusy(false);
      toast.error("Google sign-in failed. Please try again.");
    }
  };

  return (
    <AuthShell
      title="Sign in to Kodarai"
      subtitle="Find businesses without websites and close them fast."
      footer={
        <>
          New here?{" "}
          <Link to="/signup" className="font-semibold text-primary hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <GoogleButton onClick={handleGoogle} loading={busy} />

      <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
      </div>

      <form onSubmit={handlePassword} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />
        </div>

        <div className="flex items-center gap-2">
          <Checkbox
            id="remember-me"
            checked={rememberMe}
            onCheckedChange={(checked) => setRememberMeState(checked === true)}
          />
          <Label htmlFor="remember-me" className="cursor-pointer text-sm font-normal text-muted-foreground">
            Keep me signed in on this device
          </Label>
        </div>

        {HCAPTCHA_SITE_KEY && (
          <HCaptcha
            ref={captchaRef}
            sitekey={HCAPTCHA_SITE_KEY}
            theme={document.documentElement.classList.contains("dark") ? "dark" : "light"}
            onVerify={setCaptchaToken}
            onExpire={resetCaptcha}
          />
        )}

        <Button type="submit" variant="hero" size="lg" className="w-full" disabled={busy}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : "Sign in"}
        </Button>
      </form>

      <Button
        type="button"
        variant="ghost"
        className="mt-3 w-full"
        onClick={handleForgotPassword}
        disabled={busy}
      >
        <KeyRound className="size-4" /> Forgot password?
      </Button>
    </AuthShell>
  );
}
