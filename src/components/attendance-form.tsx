"use client";

import { useState } from "react";
import { CLASSES, type ClassId } from "@/config/guild";
import { saveAttendanceAction } from "@/lib/actions/events";
import { ActionForm, Submit } from "./forms";

type Row = {
  id: string;
  name: string;
  class: ClassId;
  memberName: string | null;
  signup: "yes" | "maybe" | "no" | null;
};
type Status = "present" | "late" | "bench" | "absent" | "";

const OPTIONS: { value: Status; label: string; tone: string }[] = [
  { value: "present", label: "Here", tone: "yes" },
  { value: "late", label: "Late", tone: "maybe" },
  { value: "bench", label: "Bench", tone: "info" },
  { value: "absent", label: "No-show", tone: "no" },
];

const TONE: Record<string, string> = {
  yes: "border-yes/60 bg-yes/10 text-yes",
  maybe: "border-maybe/60 bg-maybe/10 text-maybe",
  info: "border-info/60 bg-info/10 text-info",
  no: "border-no/60 bg-no/10 text-no",
};

export function AttendanceForm({
  eventId,
  rows,
  initial,
  award,
}: {
  eventId: string;
  rows: Row[];
  initial: Record<string, Status>;
  award: number;
}) {
  const [state, setState] = useState<Record<string, Status>>(initial);
  const set = (id: string, v: Status) => setState((s) => ({ ...s, [id]: s[id] === v ? "" : v }));
  const counted = Object.values(state).filter((v) => v === "present" || v === "late" || v === "bench").length;

  return (
    <ActionForm action={saveAttendanceAction} className="flex flex-col gap-4">
      <input type="hidden" name="eventId" value={eventId} />
      {Object.entries(state).map(([id, v]) => (v ? <input key={id} type="hidden" name={`att:${id}`} value={v} /> : null))}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="btn btn-sm"
          onClick={() =>
            setState((s) => {
              const n = { ...s };
              for (const r of rows) if (r.signup === "yes" && !n[r.id]) n[r.id] = "present";
              return n;
            })
          }
        >
          Mark all “In” as here
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setState({})}>
          Clear
        </button>
        <span className="ml-auto text-xs text-muted">
          {counted} counted{award ? ` · +${award} DKP each` : ""}
        </span>
      </div>

      <ul className="card divide-y divide-line">
        {rows.map((r) => (
          <li key={r.id} className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
            <div className="min-w-0">
              <span className="font-semibold" style={{ color: CLASSES[r.class].color }}>
                {r.name}
              </span>
              <span className="ml-2 text-xs text-muted">
                {r.memberName ?? ""}
                {r.signup ? ` · signed ${r.signup}` : ""}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-1.5 sm:flex">
              {OPTIONS.map((o) => {
                const on = state[r.id] === o.value;
                return (
                  <button
                    key={o.value}
                    type="button"
                    aria-pressed={on}
                    onClick={() => set(r.id, o.value)}
                    className={`h-10 rounded-lg border px-1.5 text-xs font-semibold whitespace-nowrap transition-colors sm:px-3 ${
                      on ? TONE[o.tone] : "border-line-strong text-ink-dim hover:text-ink"
                    }`}
                  >
                    {o.label}
                  </button>
                );
              })}
            </div>
          </li>
        ))}
      </ul>

      <div className="sticky bottom-20 flex justify-end lg:bottom-4">
        <Submit className="btn btn-gold shadow-lg shadow-black/50">Save attendance</Submit>
      </div>
    </ActionForm>
  );
}
