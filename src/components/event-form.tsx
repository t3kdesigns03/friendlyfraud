"use client";

import { useState } from "react";
import { EVENT_KIND_LABELS, EVENT_KINDS, RULESET_LABELS, RULESETS } from "@/config/guild";
import type { ActionState } from "@/lib/actions/util";
import { ActionForm, Submit } from "./forms";

export type EventFormValues = {
  id?: string;
  title: string;
  kind: string;
  raidId: string;
  ruleset: string;
  startsAt: string; // datetime-local in guild time
  durationMinutes: number;
  capacity: number | null;
  description: string;
  countsForAttendance: boolean;
};

export function EventForm({
  action,
  initial,
  raids,
  tzLabel,
  submitLabel,
}: {
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  initial: EventFormValues;
  raids: { id: string; name: string; size: number }[];
  tzLabel: string;
  submitLabel: string;
}) {
  const [title, setTitle] = useState(initial.title);
  const [kind, setKind] = useState(initial.kind);
  const [raidId, setRaidId] = useState(initial.raidId);
  const [capacity, setCapacity] = useState(initial.capacity?.toString() ?? "");

  return (
    <ActionForm action={action} className="flex flex-col gap-6">
      {initial.id && <input type="hidden" name="id" value={initial.id} />}
      <div className="card flex flex-col gap-4 p-5">
        <div className="field">
          <span className="label">Type</span>
          <div className="seg-group">
            {EVENT_KINDS.map((k) => (
              <label key={k} className="seg">
                <input
                  type="radio"
                  name="kind"
                  value={k}
                  className="sr-only"
                  checked={kind === k}
                  onChange={() => {
                    setKind(k);
                    if (k !== "raid") setRaidId("");
                  }}
                />
                <span className="!min-h-10 !text-[13px]">{EVENT_KIND_LABELS[k].replace(" night", "")}</span>
              </label>
            ))}
          </div>
        </div>

        {kind === "raid" && (
          <div className="field">
            <label className="label" htmlFor="raidId">
              Raid
            </label>
            <select
              id="raidId"
              name="raidId"
              className="input"
              value={raidId}
              onChange={(e) => {
                const r = raids.find((x) => x.id === e.target.value);
                setRaidId(e.target.value);
                if (r) {
                  if (!title || raids.some((x) => x.name === title)) setTitle(r.name);
                  setCapacity(String(r.size));
                }
              }}
            >
              <option value="">— Not a specific raid —</option>
              {raids.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.size})
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="field">
          <label className="label" htmlFor="title">
            Title
          </label>
          <input
            id="title"
            name="title"
            className="input"
            required
            maxLength={80}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
          <div className="field">
            <label className="label" htmlFor="startsAt">
              Starts <span className="font-normal text-muted">({tzLabel})</span>
            </label>
            <input id="startsAt" name="startsAt" type="datetime-local" className="input" required defaultValue={initial.startsAt} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="field">
              <label className="label" htmlFor="durationMinutes">
                Minutes
              </label>
              <input
                id="durationMinutes"
                name="durationMinutes"
                type="number"
                inputMode="numeric"
                min={15}
                max={720}
                step={15}
                className="input sm:w-28"
                defaultValue={initial.durationMinutes}
              />
            </div>
            <div className="field">
              <label className="label" htmlFor="capacity">
                Size
              </label>
              <input
                id="capacity"
                name="capacity"
                type="number"
                inputMode="numeric"
                min={1}
                max={40}
                className="input sm:w-24"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="field">
          <label className="label" htmlFor="ruleset">
            Ruleset <span className="font-normal text-muted">(optional)</span>
          </label>
          <select id="ruleset" name="ruleset" className="input" defaultValue={initial.ruleset}>
            <option value="">Any</option>
            {RULESETS.map((r) => (
              <option key={r} value={r}>
                {RULESET_LABELS[r]}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label className="label" htmlFor="description">
            Notes
          </label>
          <textarea
            id="description"
            name="description"
            className="input"
            rows={3}
            maxLength={1000}
            placeholder="Consumables, strats, who's leading…"
            defaultValue={initial.description}
          />
        </div>

        <label className="flex items-center gap-3 text-sm text-ink">
          <input
            type="checkbox"
            name="countsForAttendance"
            defaultChecked={initial.countsForAttendance}
            className="h-4 w-4 accent-[var(--gold)]"
          />
          Counts toward attendance %
        </label>
      </div>
      <div className="flex justify-end">
        <Submit>{submitLabel}</Submit>
      </div>
    </ActionForm>
  );
}
