import { cookies } from "next/headers";
import crypto from "crypto";

const COOKIE_NAME = "admin_session";
const TTL_MS = 24 * 60 * 60 * 1000;

function getSecret(): string {
  const secret = process.env.ADMIN_PASSWORD;
  if (!secret || secret.length < 4) {
    throw new Error("ADMIN_PASSWORD must be set and at least 4 characters");
  }
  return secret;
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", getSecret()).update(payload).digest("hex");
}

export function createSessionToken(): string {
  const payload = JSON.stringify({ t: Date.now() });
  const sig = sign(payload);
  return Buffer.from(payload).toString("base64url") + "." + sig;
}

export function verifySessionToken(token: string): boolean {
  try {
    const [payloadB64, sig] = token.split(".");
    if (!payloadB64 || !sig) return false;
    const payloadStr = Buffer.from(payloadB64, "base64url").toString("utf-8");
    const payload = JSON.parse(payloadStr);
    if (typeof payload.t !== "number") return false;
    if (Date.now() - payload.t > TTL_MS) return false;
    const expected = sign(payloadStr);
    return crypto.timingSafeEqual(Buffer.from(sig, "utf-8"), Buffer.from(expected, "utf-8"));
  } catch {
    return false;
  }
}

export async function isAdmin(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  return !!token && verifySessionToken(token);
}

export async function setAdminCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, createSessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: TTL_MS / 1000,
    path: "/",
  });
}

export async function clearAdminCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
