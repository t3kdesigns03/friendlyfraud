"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { checkPasscode, endSession, passcodeConfigured, startSession, throttle } from "@/lib/auth";
import { createAnnouncement, deleteAnnouncement, setPinned } from "@/lib/data/announcements";
import { importGuildRoster, runProbe, setBlizzardSync, syncAll } from "@/api";
import { RULESETS } from "@/config/guild";
import { bool, guarded, oneOf, optStr, str, uuid, type ActionState } from "./util";

// --- auth ------------------------------------------------------------------

export async function loginAction(_: ActionState, fd: FormData): Promise<ActionState> {
  if (!passcodeConfigured()) return { error: "GUILD_PASSCODE isn't set on the server yet." };
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (!throttle(ip)) return { error: "Too many attempts. Try again in a few minutes." };
  if (!checkPasscode(String(fd.get("passcode") ?? ""))) return { error: "That's not the passcode." };
  await startSession();
  const next = String(fd.get("next") ?? "/");
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/");
}

export async function logoutAction() {
  await endSession();
  redirect("/");
}

// --- announcements ---------------------------------------------------------

export async function createAnnouncementAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return guarded(async () => {
    await createAnnouncement({
      title: str(fd, "title", { required: "Title is required.", max: 120 }),
      body: str(fd, "body", { max: 4000 }),
      pinned: bool(fd, "pinned"),
      author: optStr(fd, "author", 40),
    });
    revalidatePath("/", "layout");
    return { ok: true, message: "Posted." };
  });
}

export async function togglePinAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return guarded(async () => {
    await setPinned(uuid(fd, "id", "post"), bool(fd, "pinned"));
    revalidatePath("/", "layout");
  });
}

export async function deleteAnnouncementAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return guarded(async () => {
    await deleteAnnouncement(uuid(fd, "id", "post"));
    revalidatePath("/", "layout");
  });
}

// --- Blizzard API (all calls go through the @/api facade) -------------------

export async function runProbeAction(): Promise<ActionState> {
  return guarded(async () => {
    const r = await runProbe();
    revalidatePath("/", "layout");
    return r.status === "error" ? { error: r.message } : { ok: true, message: r.message };
  });
}

export async function setSyncFlagAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return guarded(async () => {
    const enabled = bool(fd, "enabled");
    await setBlizzardSync(enabled);
    revalidatePath("/", "layout");
    return { ok: true, message: enabled ? "Sync flag turned on." : "Sync flag turned off." };
  });
}

export async function syncAllAction(): Promise<ActionState> {
  return guarded(async () => {
    const r = await syncAll();
    revalidatePath("/", "layout");
    if ("dark" in r) return { error: "Sync is dark — no Forever namespace yet." };
    const ok = r.results.filter((x) => x.ok).length;
    return { ok: true, message: `Synced ${ok}/${r.results.length} characters.` };
  });
}

export async function importRosterAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return guarded(async () => {
    const r = await importGuildRoster(
      str(fd, "guildSlug", { required: "Guild slug is required.", max: 80 }),
      oneOf(fd, "ruleset", RULESETS, "ruleset"),
    );
    revalidatePath("/", "layout");
    if ("dark" in r) return { error: "Sync is dark — no Forever namespace yet." };
    if (!r.ok) return { error: `Battle.net returned ${r.status} for that guild.` };
    return { ok: true, message: `Imported ${r.imported}, skipped ${r.skipped} (already on roster or unparseable).` };
  });
}
