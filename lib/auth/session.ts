// Shared-password gate (no per-user accounts — the whole team uses one password). Session cookie
// value is an HMAC of a fixed payload, not the password itself, so the cookie never reveals or
// round-trips the actual password. Uses Web Crypto (crypto.subtle) rather than Node's "crypto"
// module because this runs in both Edge middleware and Node API routes, and subtle.crypto is the
// only HMAC API available in both.
export const SESSION_COOKIE_NAME = "ani_ra_session";
const SESSION_PAYLOAD = "ani-ra-authenticated";

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function hmac(secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(SESSION_PAYLOAD));
  return toHex(signature);
}

export async function createSessionToken(): Promise<string> {
  const secret = process.env.APP_PASSWORD_SECRET;
  if (!secret) throw new Error("APP_PASSWORD_SECRET is not set");
  return hmac(secret);
}

export async function isValidSessionToken(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const secret = process.env.APP_PASSWORD_SECRET;
  if (!secret) return false;
  return token === (await hmac(secret));
}
