import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import { isWriter } from "@/lib/auth";

/** Allow either a passcode session cookie or `Authorization: Bearer $PROBE_SECRET` (cron). */
export async function authorizeMachineOrWriter(req: Request) {
  const secret = process.env.PROBE_SECRET;
  const header = req.headers.get("authorization") ?? "";
  if (secret && header.startsWith("Bearer ")) {
    const h = (s: string) => createHash("sha256").update(s).digest();
    if (timingSafeEqual(h(header.slice(7)), h(secret))) return true;
  }
  return isWriter();
}
