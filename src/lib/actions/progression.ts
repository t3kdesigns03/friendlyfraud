"use server";

import { revalidatePath } from "next/cache";
import { fromLocalInput } from "@/lib/time";
import { addBoss, deleteBoss, moveBoss, recordKill, renameBoss, undoLastKill } from "@/lib/data/progression";
import { guarded, optStr, optUuid, str, uuid, type ActionState } from "./util";

const done = (message?: string): ActionState => {
  revalidatePath("/", "layout");
  return { ok: true, message };
};

export async function addBossAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return guarded(async () => {
    await addBoss(str(fd, "raidId", { required: "Pick a raid." }), str(fd, "name", { required: "Boss name is required.", max: 60 }));
    return done();
  });
}

export async function renameBossAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return guarded(async () => {
    await renameBoss(uuid(fd, "id", "boss"), str(fd, "name", { required: "Boss name is required.", max: 60 }));
    return done();
  });
}

export async function deleteBossAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return guarded(async () => {
    await deleteBoss(uuid(fd, "id", "boss"));
    return done();
  });
}

export async function moveBossAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return guarded(async () => {
    await moveBoss(uuid(fd, "id", "boss"), str(fd, "dir") === "up" ? -1 : 1);
    return done();
  });
}

export async function recordKillAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return guarded(async () => {
    const when = str(fd, "killedAt");
    await recordKill(
      uuid(fd, "bossId", "boss"),
      (when && fromLocalInput(when)) || new Date(),
      optUuid(fd, "eventId"),
      optStr(fd, "note", 200),
    );
    return done("Kill recorded.");
  });
}

export async function undoKillAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return guarded(async () => {
    await undoLastKill(uuid(fd, "bossId", "boss"));
    return done();
  });
}
