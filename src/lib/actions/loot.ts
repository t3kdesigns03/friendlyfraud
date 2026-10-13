"use server";

import { revalidatePath } from "next/cache";
import { ITEM_QUALITIES } from "@/config/guild";
import { fromLocalInput } from "@/lib/time";
import { adjustDkp, applyDecay, deleteLoot, recordLoot } from "@/lib/data/loot";
import { saveDkpSettings } from "@/lib/data/settings";
import { guarded, InputError, int, oneOf, optStr, optUuid, str, uuid, type ActionState } from "./util";

export async function recordLootAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return guarded(async () => {
    const itemName = str(fd, "itemName", { required: "Item name is required.", max: 120 });
    const when = str(fd, "awardedAt");
    await recordLoot({
      characterId: uuid(fd, "characterId", "character"),
      itemName,
      itemId: int(fd, "itemId", { min: 1, label: "Item ID" }),
      quality: oneOf(fd, "quality", ITEM_QUALITIES, "quality"),
      dkpCost: int(fd, "dkpCost", { min: 0, max: 100000, label: "DKP cost" }) ?? 0,
      councilNote: optStr(fd, "councilNote", 500),
      eventId: optUuid(fd, "eventId"),
      bossId: optUuid(fd, "bossId"),
      awardedAt: (when && fromLocalInput(when)) || new Date(),
    });
    revalidatePath("/", "layout");
    return { ok: true, message: `${itemName} recorded.` };
  });
}

export async function deleteLootAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return guarded(async () => {
    await deleteLoot(uuid(fd, "id", "loot entry"));
    revalidatePath("/", "layout");
    return { ok: true, message: "Removed and DKP refunded." };
  });
}

export async function applyDecayAction(): Promise<ActionState> {
  return guarded(async () => {
    const r = await applyDecay();
    revalidatePath("/", "layout");
    if (!r.percent) return { error: "Decay is set to 0% in Settings." };
    return { ok: true, message: `Applied ${r.percent}% decay to ${r.affected} balance${r.affected === 1 ? "" : "s"}.` };
  });
}

export async function adjustDkpAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return guarded(async () => {
    const amount = int(fd, "amount", { min: -100000, max: 100000, label: "Amount" });
    if (!amount) throw new InputError("Enter a non-zero amount.");
    await adjustDkp(uuid(fd, "characterId", "character"), amount, str(fd, "reason", { max: 140 }) || "Manual adjustment");
    revalidatePath("/", "layout");
    return { ok: true, message: "Adjustment saved." };
  });
}

export async function saveDkpSettingsAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return guarded(async () => {
    await saveDkpSettings({
      startingBalance: int(fd, "startingBalance", { min: 0, max: 100000, label: "Starting DKP" }) ?? 0,
      attendanceAward: int(fd, "attendanceAward", { min: 0, max: 10000, label: "Attendance award" }) ?? 0,
      decayPercent: int(fd, "decayPercent", { min: 0, max: 100, label: "Decay %" }) ?? 0,
    });
    revalidatePath("/", "layout");
    return { ok: true, message: "DKP settings saved. They apply to new characters, check-ins and decay from now on." };
  });
}
