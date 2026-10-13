"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  CHARACTER_STATUSES,
  CLASS_IDS,
  RACE_IDS,
  REGIONS,
  REGION_LABELS,
  ROLES,
  RULESETS,
} from "@/config/guild";
import { characterPath, normalizeNamePart, validateNamePart } from "@/lib/identity";
import { createCharacter, deleteCharacter, getCharacterById, updateCharacter, type CharacterInput } from "@/lib/data/roster";
import { syncCharacter } from "@/api";
import { bool, guarded, InputError, int, oneOf, optStr, str, uuid, type ActionState } from "./util";

function parseCharacter(fd: FormData): CharacterInput {
  const firstName = normalizeNamePart(str(fd, "firstName"));
  const secondName = normalizeNamePart(str(fd, "secondName"));
  const err = validateNamePart(firstName, "First name") ?? validateNamePart(secondName, "Second name");
  if (err) throw new InputError(err);
  return {
    firstName,
    secondName,
    region: oneOf(fd, "region", REGIONS, "region"),
    ruleset: oneOf(fd, "ruleset", RULESETS, "ruleset"),
    class: oneOf(fd, "class", CLASS_IDS, "class"),
    race: oneOf(fd, "race", RACE_IDS, "race"),
    role: oneOf(fd, "role", ROLES, "role"),
    status: oneOf(fd, "status", CHARACTER_STATUSES, "status"),
    isMain: bool(fd, "isMain"),
    level: int(fd, "level", { min: 1, max: 60, label: "Level" }),
    memberName: str(fd, "memberName", { max: 40 }),
    notes: optStr(fd, "notes", 500),
  };
}

function duplicateMessage(c: CharacterInput) {
  return `${c.firstName} ${c.secondName} is already on the roster (${REGION_LABELS[c.region]}). Names are unique per region.`;
}

export async function createCharacterAction(_: ActionState, fd: FormData): Promise<ActionState> {
  let path = "";
  const res = await guarded(async () => {
    const input = parseCharacter(fd);
    try {
      await createCharacter(input);
    } catch (e) {
      if ((e as { code?: string }).code === "23505") throw new InputError(duplicateMessage(input));
      throw e;
    }
    revalidatePath("/", "layout");
    path = characterPath(input);
  });
  if (path) redirect(path);
  return res;
}

export async function updateCharacterAction(_: ActionState, fd: FormData): Promise<ActionState> {
  let path = "";
  const res = await guarded(async () => {
    const id = uuid(fd, "id", "character");
    const input = parseCharacter(fd);
    try {
      await updateCharacter(id, input);
    } catch (e) {
      if ((e as { code?: string }).code === "23505") throw new InputError(duplicateMessage(input));
      throw e;
    }
    revalidatePath("/", "layout");
    path = characterPath(input);
  });
  if (path) redirect(path);
  return res;
}

export async function deleteCharacterAction(_: ActionState, fd: FormData): Promise<ActionState> {
  let done = false;
  const res = await guarded(async () => {
    const id = uuid(fd, "id", "character");
    if (!(await getCharacterById(id))) throw new InputError("Character not found.");
    await deleteCharacter(id);
    revalidatePath("/", "layout");
    done = true;
  });
  if (done) redirect("/roster");
  return res;
}

export async function syncCharacterAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return guarded(async () => {
    const r = await syncCharacter(uuid(fd, "id", "character"));
    revalidatePath("/", "layout");
    if ("dark" in r) return { error: "Blizzard sync is still dark — no Forever namespace yet." };
    if (!r.ok) return { error: `Battle.net didn't return this character (${r.status ?? r.error}).` };
    return { ok: true, message: "Synced from Battle.net." };
  });
}
