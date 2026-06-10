/**
 * Telnyx server utilities.
 * Replaces twilio.server.ts — keep the same export shape for easy swapping.
 */

export function getTelnyxWebhookUrl(): string {
  const base = process.env.TELNYX_WEBHOOK_BASE_URL ?? "https://kodarai.xyz";
  return `${base}/api/webhooks/sms-incoming`;
}

/**
 * Verify a Telnyx inbound webhook.
 *
 * Telnyx signs payloads with Ed25519.
 *   - Header: telnyx-signature-ed25519 (base64)
 *   - Header: telnyx-timestamp (Unix seconds as string)
 *   - Signed message: `<timestamp>|<rawBody>`
 *   - Public key: TELNYX_WEBHOOK_SECRET env var (base64-encoded raw 32-byte public key)
 *
 * Security:
 *   - Fails CLOSED if TELNYX_WEBHOOK_SECRET is not set in production.
 *   - Rejects requests whose timestamp is more than 5 minutes old (replay protection).
 *   - Development bypass (NODE_ENV !== "production") only when secret is also absent.
 */
export async function verifyTelnyxWebhook(
  rawBody: string,
  signatureB64: string,
  timestamp: string,
): Promise<boolean> {
  const secret = process.env.TELNYX_WEBHOOK_SECRET;

  // Development shortcut — only when secret is explicitly absent
  if (!secret) {
    if (process.env.NODE_ENV !== "production") return true;
    console.error("[Telnyx] TELNYX_WEBHOOK_SECRET not set — rejecting webhook (fail-closed)");
    return false; // FAIL CLOSED in production
  }

  // ── Timestamp freshness (±5 minutes) — prevents replay attacks ──────────────
  const ts = parseInt(timestamp, 10);
  if (isNaN(ts)) return false;
  const ageSeconds = Math.abs(Math.floor(Date.now() / 1000) - ts);
  if (ageSeconds > 300) {
    console.warn(`[Telnyx] Webhook timestamp too old/future (${ageSeconds}s) — rejecting`);
    return false;
  }

  try {
    // Node.js built-in Ed25519 verify
    const { verify, createPublicKey } = await import("node:crypto");

    const message   = Buffer.from(`${timestamp}|${rawBody}`);
    const signature = Buffer.from(signatureB64, "base64");
    const pubKeyDer = Buffer.from(secret, "base64");

    // TELNYX_WEBHOOK_SECRET is the base64-encoded raw 32-byte public key.
    // Wrap it in SubjectPublicKeyInfo (SPKI) for Node's createPublicKey.
    // Ed25519 SPKI prefix = 302a300506032b6570032100  (12 bytes)
    const SPKI_PREFIX = Buffer.from("302a300506032b6570032100", "hex");
    const spkiDer = pubKeyDer.length === 32
      ? Buffer.concat([SPKI_PREFIX, pubKeyDer])
      : pubKeyDer; // assume already full DER if not 32 bytes

    const publicKey = createPublicKey({ key: spkiDer, format: "der", type: "spki" });
    return verify(null, message, publicKey, signature);
  } catch (err) {
    console.error("[Telnyx] Webhook signature verification error:", err);
    return false;
  }
}
