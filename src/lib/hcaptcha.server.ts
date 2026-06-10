/**
 * Server-side hCaptcha token verification.
 * Uses HCAPTCHA_SECRET_KEY env var.  In development (NODE_ENV !== "production")
 * the check is bypassed when the secret is not set so local testing still works.
 */

export async function verifyHCaptcha(token: string | null | undefined): Promise<boolean> {
  if (!token) return false;

  const secret = process.env.HCAPTCHA_SECRET_KEY;

  // Secret not configured — skip verification (warn once, don't block users)
  if (!secret) {
    console.warn("[hCaptcha] HCAPTCHA_SECRET_KEY not set — skipping captcha check");
    return true;
  }

  try {
    const params = new URLSearchParams({ secret, response: token });
    const res = await fetch("https://api.hcaptcha.com/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });
    const data = (await res.json()) as { success: boolean; "error-codes"?: string[] };
    if (!data.success) {
      console.warn("[hCaptcha] verification failed", data["error-codes"]);
    }
    return data.success === true;
  } catch (err) {
    console.error("[hCaptcha] siteverify error:", err);
    return false;
  }
}
