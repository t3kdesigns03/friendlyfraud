"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { EVENT_KINDS, ROLES, RULESETS, type Ruleset } from "@/config/guild";
import { fromLocalInput } from "@/lib/time";
import {
  createEvent,
  deleteEvent,
  getEvent,
  removeSignup,
  updateEvent,
  upsertSignup,
  type EventInput,
} from "@/lib/data/events";
import { ATTENDANCE_STATUSES, saveAttendance, type AttendanceStatus } from "@/lib/data/attendance";
import { bool, guarded, InputError, int, oneOf, optStr, str, uuid, type ActionState } from "./util";

function parseEvent(fd: FormData): EventInput {
  const startsAt = fromLocalInput(str(fd, "startsAt", { required: "Pick a date and time." }));
  if (!startsAt) throw new InputError("Pick a valid date and time.");
  const raidId = str(fd, "raidId") || null;
  const ruleset = str(fd, "ruleset");
  return {
    title: str(fd, "title", { required: "Give the event a title.", max: 80 }),
    kind: oneOf(fd, "kind", EVENT_KINDS, "type"),
    raidId,
    ruleset: ruleset && (RULESETS as readonly string[]).includes(ruleset) ? (ruleset as Ruleset) : null,
    startsAt,
    durationMinutes: int(fd, "durationMinutes", { min: 15, max: 720, label: "Duration" }) ?? 180,
    capacity: int(fd, "capacity", { min: 1, max: 40, label: "Size" }),
    description: optStr(fd, "description", 1000),
    countsForAttendance: bool(fd, "countsForAttendance"),
  };
}

export async function createEventAction(_: ActionState, fd: FormData): Promise<ActionState> {
  let id = "";
  const res = await guarded(async () => {
    id = await createEvent(parseEvent(fd));
    revalidatePath("/", "layout");
  });
  if (id) redirect(`/events/${id}`);
  return res;
}

export async function updateEventAction(_: ActionState, fd: FormData): Promise<ActionState> {
  let id = "";
  const res = await guarded(async () => {
    const eventId = uuid(fd, "id", "event");
    await updateEvent(eventId, parseEvent(fd));
    revalidatePath("/", "layout");
    id = eventId;
  });
  if (id) redirect(`/events/${id}`);
  return res;
}

export async function deleteEventAction(_: ActionState, fd: FormData): Promise<ActionState> {
  let done = false;
  const res = await guarded(async () => {
    await deleteEvent(uuid(fd, "id", "event"));
    revalidatePath("/", "layout");
    done = true;
  });
  if (done) redirect("/events");
  return res;
}

export async function signupAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return guarded(async () => {
    const eventId = uuid(fd, "eventId", "event");
    const characterId = uuid(fd, "characterId", "character");
    const status = oneOf(fd, "status", ["yes", "maybe", "no"] as const, "response");
    await upsertSignup({
      eventId,
      characterId,
      status,
      role: oneOf(fd, "role", ROLES, "role"),
      note: optStr(fd, "note", 140),
    });
    revalidatePath("/", "layout");
    return { ok: true, message: status === "yes" ? "You're in." : status === "maybe" ? "Marked as maybe." : "Marked as out." };
  });
}

export async function removeSignupAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return guarded(async () => {
    await removeSignup(uuid(fd, "eventId", "event"), uuid(fd, "characterId", "character"));
    revalidatePath("/", "layout");
  });
}

export async function saveAttendanceAction(_: ActionState, fd: FormData): Promise<ActionState> {
  let id = "";
  const res = await guarded(async () => {
    const eventId = uuid(fd, "eventId", "event");
    const event = await getEvent(eventId);
    if (!event) throw new InputError("Event not found.");
    const entries: { characterId: string; status: AttendanceStatus }[] = [];
    for (const [key, value] of fd.entries()) {
      if (!key.startsWith("att:")) continue;
      const characterId = key.slice(4);
      if (!/^[0-9a-f-]{36}$/i.test(characterId)) continue;
      if ((ATTENDANCE_STATUSES as readonly string[]).includes(String(value))) {
        entries.push({ characterId, status: value as AttendanceStatus });
      }
    }
    await saveAttendance(eventId, event.title, entries);
    revalidatePath("/", "layout");
    id = eventId;
  });
  if (id) redirect(`/events/${id}?saved=attendance`);
  return res;
}
