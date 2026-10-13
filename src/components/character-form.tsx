"use client";

import { useState } from "react";
import {
  CLASS_IDS,
  CLASSES,
  DEFAULT_REGION,
  RACE_IDS,
  RACES,
  REGION_LABELS,
  REGIONS,
  ROLE_LABELS,
  ROLES,
  RULESET_LABELS,
  RULESETS,
  type ClassId,
  type Role,
} from "@/config/guild";
import type { ActionState } from "@/lib/actions/util";
import { ActionForm, Submit } from "./forms";
import { ROLE_ICONS } from "./icons";

export type CharacterFormValues = {
  id?: string;
  firstName: string;
  secondName: string;
  region: string;
  ruleset: string;
  class: ClassId | "";
  race: string;
  role: Role;
  isMain: boolean;
  status: string;
  level: number | null;
  memberName: string;
  notes: string;
};

export const EMPTY_CHARACTER: CharacterFormValues = {
  firstName: "",
  secondName: "",
  region: DEFAULT_REGION,
  ruleset: "normal",
  class: "",
  race: "",
  role: "dps",
  isMain: true,
  status: "planned",
  level: null,
  memberName: "",
  notes: "",
};

export function CharacterForm({
  action,
  initial,
  members,
  submitLabel,
}: {
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  initial: CharacterFormValues;
  members: string[];
  submitLabel: string;
}) {
  const [cls, setCls] = useState<ClassId | "">(initial.class);
  const [role, setRole] = useState<Role>(initial.role);
  const [first, setFirst] = useState(initial.firstName);
  const [second, setSecond] = useState(initial.secondName);
  const allowedRoles: readonly Role[] = cls ? CLASSES[cls].roles : ROLES;
  const color = cls ? CLASSES[cls].color : "var(--text)";

  return (
    <ActionForm action={action} className="flex flex-col gap-6">
      {initial.id && <input type="hidden" name="id" value={initial.id} />}

      <fieldset className="card flex flex-col gap-4 p-5">
        <legend className="sr-only">Identity</legend>
        <div className="flex items-baseline justify-between gap-3">
          <div className="eyebrow">Identity</div>
          <div className="truncate text-lg font-semibold" style={{ color }} aria-live="polite">
            {first || second ? `${first || "…"} ${second || "…"}` : <span className="text-muted">Name preview</span>}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="field">
            <label className="label" htmlFor="firstName">
              First name
            </label>
            <input
              id="firstName"
              name="firstName"
              className="input"
              required
              autoComplete="off"
              autoCapitalize="words"
              spellCheck={false}
              maxLength={24}
              value={first}
              onChange={(e) => setFirst(e.target.value.replace(/\s/g, ""))}
            />
          </div>
          <div className="field">
            <label className="label" htmlFor="secondName">
              Second name
            </label>
            <input
              id="secondName"
              name="secondName"
              className="input"
              required
              autoComplete="off"
              autoCapitalize="words"
              spellCheck={false}
              maxLength={24}
              value={second}
              onChange={(e) => setSecond(e.target.value.replace(/\s/g, ""))}
            />
          </div>
        </div>
        <p className="hint -mt-1">Forever names are two parts, unique per region. Letters only.</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="field">
            <label className="label" htmlFor="region">
              Region
            </label>
            <select id="region" name="region" className="input" defaultValue={initial.region}>
              {REGIONS.map((r) => (
                <option key={r} value={r}>
                  {REGION_LABELS[r]} ({r.toUpperCase()})
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label className="label" htmlFor="ruleset">
              Ruleset
            </label>
            <select id="ruleset" name="ruleset" className="input" defaultValue={initial.ruleset}>
              {RULESETS.map((r) => (
                <option key={r} value={r}>
                  {RULESET_LABELS[r]}
                  {r === "hardcore" ? " (post-launch)" : ""}
                </option>
              ))}
            </select>
          </div>
        </div>
      </fieldset>

      <fieldset className="card flex flex-col gap-4 p-5">
        <legend className="sr-only">Character</legend>
        <div className="eyebrow">Character</div>
        <div className="grid grid-cols-2 gap-3">
          <div className="field">
            <label className="label" htmlFor="class">
              Class
            </label>
            <select
              id="class"
              name="class"
              className="input"
              required
              value={cls}
              style={cls ? { color } : undefined}
              onChange={(e) => {
                const next = e.target.value as ClassId;
                setCls(next);
                if (next && !(CLASSES[next].roles as readonly Role[]).includes(role)) setRole(CLASSES[next].roles[0]);
              }}
            >
              <option value="" disabled>
                Choose…
              </option>
              {CLASS_IDS.map((id) => (
                <option key={id} value={id} style={{ color: CLASSES[id].color }}>
                  {CLASSES[id].name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label className="label" htmlFor="race">
              Race
            </label>
            <select id="race" name="race" className="input" required defaultValue={initial.race}>
              <option value="" disabled>
                Choose…
              </option>
              {RACE_IDS.map((id) => (
                <option key={id} value={id}>
                  {RACES[id].name}
                  {id === "skyborne" ? " (new)" : ""}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="field">
          <span className="label">Role</span>
          <div className="seg-group" role="radiogroup" aria-label="Role">
            {ROLES.map((r) => {
              const I = ROLE_ICONS[r];
              const disabled = !allowedRoles.includes(r);
              return (
                <label key={r} className={`seg ${disabled ? "pointer-events-none opacity-30" : ""}`}>
                  <input
                    type="radio"
                    name="role"
                    value={r}
                    className="peer sr-only"
                    checked={role === r}
                    disabled={disabled}
                    onChange={() => setRole(r)}
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

        <div className="grid grid-cols-2 gap-3">
          <div className="field">
            <label className="label" htmlFor="status">
              Status
            </label>
            <select id="status" name="status" className="input" defaultValue={initial.status}>
              <option value="planned">Planned (pre-launch)</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div className="field">
            <label className="label" htmlFor="level">
              Level <span className="font-normal text-muted">(optional)</span>
            </label>
            <input
              id="level"
              name="level"
              type="number"
              inputMode="numeric"
              min={1}
              max={60}
              className="input"
              defaultValue={initial.level ?? ""}
            />
          </div>
        </div>
      </fieldset>

      <fieldset className="card flex flex-col gap-4 p-5">
        <legend className="sr-only">Player</legend>
        <div className="eyebrow">Player</div>
        <div className="field">
          <label className="label" htmlFor="memberName">
            Who plays it
          </label>
          <input
            id="memberName"
            name="memberName"
            className="input"
            list="members"
            autoComplete="off"
            maxLength={40}
            placeholder="e.g. Brandon"
            defaultValue={initial.memberName}
          />
          <datalist id="members">
            {members.map((m) => (
              <option key={m} value={m} />
            ))}
          </datalist>
          <p className="hint">Groups mains and alts. Pick an existing player or type a new one.</p>
        </div>
        <label className="flex items-center gap-3 text-sm text-ink">
          <input type="checkbox" name="isMain" defaultChecked={initial.isMain} className="h-4 w-4 accent-[var(--gold)]" />
          Main character <span className="text-muted">(other characters for this player become alts)</span>
        </label>
        <div className="field">
          <label className="label" htmlFor="notes">
            Notes
          </label>
          <textarea id="notes" name="notes" className="input" rows={2} maxLength={500} defaultValue={initial.notes} />
        </div>
      </fieldset>

      <div className="flex justify-end">
        <Submit>{submitLabel}</Submit>
      </div>
    </ActionForm>
  );
}
