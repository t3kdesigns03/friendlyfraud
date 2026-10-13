import { GUILD_TIMEZONE } from "@/config/guild";

// All calendar times are entered and displayed in guild time so server and
// client render identically and nobody argues about whose 8pm it is.

const tz = GUILD_TIMEZONE;

function parts(d: Date, opts: Intl.DateTimeFormatOptions) {
  return Object.fromEntries(
    new Intl.DateTimeFormat("en-US", { timeZone: tz, ...opts }).formatToParts(d).map((p) => [p.type, p.value]),
  );
}

export function tzAbbr(d: Date = new Date()) {
  return parts(d, { timeZoneName: "short" }).timeZoneName ?? tz;
}

export function fmtDate(d: Date | string) {
  return new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short", month: "short", day: "numeric" }).format(
    new Date(d),
  );
}

export function fmtDateLong(d: Date | string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(d));
}

export function fmtTime(d: Date | string) {
  const date = new Date(d);
  return `${new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", minute: "2-digit" }).format(date)} ${tzAbbr(date)}`;
}

export function fmtShortDate(d: Date | string) {
  return new Intl.DateTimeFormat("en-US", { timeZone: tz, month: "short", day: "numeric", year: "numeric" }).format(
    new Date(d),
  );
}

/** Day key in guild time, e.g. "2026-12-09". */
export function dayKey(d: Date | string) {
  const p = parts(new Date(d), { year: "numeric", month: "2-digit", day: "2-digit" });
  return `${p.year}-${p.month}-${p.day}`;
}

/** Value for <input type="datetime-local"> in guild time. */
export function toLocalInput(d: Date | string) {
  const p = parts(new Date(d), {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}

function offsetMs(at: Date) {
  const p = parts(at, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return asUtc - Math.floor(at.getTime() / 1000) * 1000;
}

/** Parse a datetime-local value ("2026-12-09T19:30") as guild time → UTC Date. */
export function fromLocalInput(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!m) return null;
  const wall = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
  // Two passes handle DST transitions.
  let guess = new Date(wall - offsetMs(new Date(wall)));
  guess = new Date(wall - offsetMs(guess));
  return guess;
}

export function daysUntil(isoDate: string, now = new Date()) {
  const target = fromLocalInput(`${isoDate}T00:00`);
  if (!target) return 0;
  return Math.ceil((target.getTime() - now.getTime()) / 864e5);
}

/** Human label for the guild zone, e.g. "New York time". */
export function tzName() {
  return `${(tz.split("/").pop() ?? tz).replace(/_/g, " ")} time`;
}
