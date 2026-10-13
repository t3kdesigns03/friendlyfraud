import { unstable_rethrow } from "next/navigation";
import { requireWriter, UnauthorizedError } from "@/lib/auth";

export type ActionState = { ok?: boolean; error?: string; message?: string };

export class InputError extends Error {}

/**
 * Wrap a server action: requires the passcode session, turns validation and
 * constraint errors into inline messages, and lets redirect() through.
 */
export async function guarded(fn: () => Promise<ActionState | void>): Promise<ActionState> {
  try {
    await requireWriter();
    return (await fn()) ?? { ok: true };
  } catch (err) {
    unstable_rethrow(err);
    if (err instanceof UnauthorizedError || err instanceof InputError) return { error: err.message };
    const pgCode = (err as { code?: string }).code;
    if (pgCode === "23505") return { error: "That already exists." };
    if (pgCode === "23503") return { error: "Something this refers to no longer exists. Refresh and try again." };
    console.error(err);
    return { error: "Something went wrong saving that. Try again." };
  }
}

export function str(fd: FormData, key: string, opts: { required?: string; max?: number } = {}) {
  const v = String(fd.get(key) ?? "").trim();
  if (!v && opts.required) throw new InputError(opts.required);
  if (opts.max && v.length > opts.max) throw new InputError(`Keep it under ${opts.max} characters.`);
  return v;
}

export function optStr(fd: FormData, key: string, max = 2000) {
  return str(fd, key, { max }) || null;
}

export function int(fd: FormData, key: string, opts: { min?: number; max?: number; label?: string } = {}) {
  const raw = String(fd.get(key) ?? "").trim();
  if (raw === "") return null;
  const n = Number(raw);
  const label = opts.label ?? key;
  if (!Number.isInteger(n)) throw new InputError(`${label} must be a whole number.`);
  if (opts.min !== undefined && n < opts.min) throw new InputError(`${label} must be at least ${opts.min}.`);
  if (opts.max !== undefined && n > opts.max) throw new InputError(`${label} must be at most ${opts.max}.`);
  return n;
}

export function oneOf<T extends string>(fd: FormData, key: string, allowed: readonly T[], label = key): T {
  const v = String(fd.get(key) ?? "");
  if (!(allowed as readonly string[]).includes(v)) throw new InputError(`Pick a ${label}.`);
  return v as T;
}

export function bool(fd: FormData, key: string) {
  const v = fd.get(key);
  return v === "on" || v === "true" || v === "1";
}

export function uuid(fd: FormData, key: string, label = key) {
  const v = String(fd.get(key) ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(v)) throw new InputError(`Pick a ${label}.`);
  return v;
}

export function optUuid(fd: FormData, key: string) {
  const v = String(fd.get(key) ?? "");
  return /^[0-9a-f-]{36}$/i.test(v) ? v : null;
}
