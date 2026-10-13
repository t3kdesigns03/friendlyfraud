import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

// Shared-passcode gate for write actions. Reads are public.
// The cookie holds an expiry + HMAC; rotating GUILD_PASSCODE or SESSION_SECRET
// invalidates every session.

const COOKIE = "ff_session";
const MAX_AGE_DAYS = 30;

function secret() {
  const passcode = process.env.GUILD_PASSCODE;
  if (!passcode) return null;
  return `${process.env.SESSION_SECRET ?? ""}:${passcode}`;
}

function sign(payload: string, key: string) {
  return createHmac("sha256", key).update(payload).digest("base64url");
}

function safeEqual(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export function passcodeConfigured() {
  return Boolean(process.env.GUILD_PASSCODE);
}

export function checkPasscode(input: string) {
  const passcode = process.env.GUILD_PASSCODE;
  if (!passcode) return false;
  // Compare HMACs so length differences don't leak.
  const k = "ff-passcode-compare";
  return safeEqual(sign(input.trim(), k), sign(passcode, k));
}

export async function startSession() {
  const key = secret();
  if (!key) throw new Error("GUILD_PASSCODE is not set");
  const exp = Date.now() + MAX_AGE_DAYS * 864e5;
  const value = `${exp}.${sign(String(exp), key)}`;
  (await cookies()).set(COOKIE, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_DAYS * 86400,
  });
}

export async function endSession() {
  (await cookies()).delete(COOKIE);
}

export async function isWriter(): Promise<boolean> {
  const key = secret();
  if (!key) return false;
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return false;
  const [exp, mac] = raw.split(".");
  if (!exp || !mac || Number(exp) < Date.now()) return false;
  return safeEqual(mac, sign(exp, key));
}

export class UnauthorizedError extends Error {
  constructor() {
    super("Enter the guild passcode to make changes.");
  }
}

export async function requireWriter() {
  if (!(await isWriter())) throw new UnauthorizedError();
}

// Naive in-memory throttle for passcode attempts (per server instance).
const attempts = new Map<string, { n: number; until: number }>();
export function throttle(key: string): boolean {
  const now = Date.now();
  const a = attempts.get(key);
  if (a && a.until > now && a.n >= 8) return false;
  if (!a || a.until <= now) attempts.set(key, { n: 1, until: now + 10 * 60_000 });
  else a.n++;
  return true;
}
