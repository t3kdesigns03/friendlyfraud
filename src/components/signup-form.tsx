"use client";

import { useMemo, useState } from "react";
import { CLASSES, ROLE_LABELS, ROLES, type ClassId, type Role } from "@/config/guild";
import { signupAction } from "@/lib/actions/events";
import { ActionForm, Submit } from "./forms";
import { ROLE_ICONS } from "./icons";

type Opt = {
  id: string;
  firstName: string;
  secondName: string;
  class: ClassId;
  role: Role;
  memberName: string | null;
  isMain: boolean;
};

export function SignupForm({
  eventId,
  characters,
  existing,
}: {
  eventId: string;
  characters: Opt[];
  existing: Record<string, { status: string; role: Role; note: string | null }>;
}) {
  const [charId, setCharId] = useState(characters.find((c) => c.isMain)?.id ?? characters[0]?.id ?? "");
  const char = characters.find((c) => c.id === charId);
  const prior = existing[charId];
  const [roleOverride, setRoleOverride] = useState<Record<string, Role>>({});
  const role = roleOverride[charId] ?? prior?.role ?? char?.role ?? "dps";
  const allowed: readonly Role[] = char ? CLASSES[char.class].roles : ROLES;

  const grouped = useMemo(() => {
    const m = new Map<string, Opt[]>();
    for (const c of characters) m.set(c.memberName ?? "Unassigned", [...(m.get(c.memberName ?? "Unassigned") ?? []), c]);
    return [...m.entries()];
  }, [characters]);

  if (characters.length === 0) {
    return <p className="text-sm text-ink-dim">Add a character to the roster first, then sign up here.</p>;
  }

  return (
    <ActionForm action={signupAction} className="flex flex-col gap-4">
      <input type="hidden" name="eventId" value={eventId} />
      <div className="field">
        <label className="label" htmlFor="characterId">
          Character
        </label>
        <select
          id="characterId"
          name="characterId"
          className="input font-semibold"
          value={charId}
          onChange={(e) => setCharId(e.target.value)}
          style={char ? { color: CLASSES[char.class].color } : undefined}
        >
          {grouped.map(([member, chars]) => (
            <optgroup key={member} label={member}>
              {chars.map((c) => (
                <option key={c.id} value={c.id} style={{ color: CLASSES[c.class].color }}>
                  {c.firstName} {c.secondName}
                  {existing[c.id] ? ` — ${existing[c.id].status}` : ""}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      <div className="field">
        <span className="label">Role</span>
        <div className="seg-group">
          {ROLES.map((r) => {
            const I = ROLE_ICONS[r];
            const disabled = !allowed.includes(r);
            return (
              <label key={r} className={`seg ${disabled ? "pointer-events-none opacity-30" : ""}`}>
                <input
                  type="radio"
                  name="role"
                  value={r}
                  className="sr-only"
                  checked={role === r}
                  disabled={disabled}
                  onChange={() => setRoleOverride((o) => ({ ...o, [charId]: r }))}
                />
                <span>
                  <I size={16} />
                  {ROLE_LABELS[r]}
                </span>
              </label>
            );
          })}
        </div>
      </div>

      <div className="field">
        <label className="label" htmlFor="note">
          Note <span className="font-normal text-muted">(optional)</span>
        </label>
        <input
          key={charId}
          id="note"
          name="note"
          className="input"
          maxLength={140}
          placeholder="Late 15 min, can swap to heals…"
          defaultValue={prior?.note ?? ""}
        />
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Submit name="status" value="yes" className="btn h-12 border-yes/40 text-yes hover:border-yes" pendingText="…">
          I&apos;m in
        </Submit>
        <Submit name="status" value="maybe" className="btn h-12 border-maybe/40 text-maybe hover:border-maybe" pendingText="…">
          Maybe
        </Submit>
        <Submit name="status" value="no" className="btn h-12 border-no/40 text-no hover:border-no" pendingText="…">
          Can&apos;t
        </Submit>
      </div>
      {prior && (
        <p className="text-center text-xs text-muted">
          Currently: <span className="font-semibold capitalize text-ink-dim">{prior.status}</span> as {ROLE_LABELS[prior.role]}
        </p>
      )}
    </ActionForm>
  );
}
