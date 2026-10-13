"use client";

import { hoverProps, sceneStore, useScene } from "@/lib/scene/store";
import type { SceneRaid } from "@/lib/scene/types";
import { worldById } from "@/lib/scene/layout";

/** Wrap any row/card so hovering or focusing it lights its match in the sky. */
export function SkyHover({ id, children, className }: { id: string | null; children: React.ReactNode; className?: string }) {
  if (!id) return <div className={className}>{children}</div>;
  return (
    <div className={className} {...hoverProps(id)}>
      {children}
    </div>
  );
}

/** One card per launch raid; hover lights the world, click opens its panel. */
export function RaidCards({ raids }: { raids: SceneRaid[] }) {
  const hovered = useScene((s) => s.hovered);
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {raids.map((r) => {
        const id = `raid:${r.id}`;
        const w = worldById(id);
        const lit = hovered === id;
        return (
          <button
            key={r.id}
            type="button"
            {...hoverProps(id)}
            onClick={() => sceneStore.setActive(id)}
            className={`glass group flex min-h-11 flex-col rounded-2xl p-4 text-left transition-[border-color,transform] duration-300 ${
              lit ? "-translate-y-0.5 border-gold-dim" : "hover:border-gold-dim"
            }`}
          >
            <span className="flex items-center gap-2">
              <span
                className="size-2 rounded-full transition-shadow"
                style={{ background: w?.color ?? "#d6b25e", boxShadow: lit ? `0 0 14px 2px ${w?.color}` : "none" }}
              />
              <span className="text-[11px] font-semibold tracking-[0.14em] text-muted uppercase">{r.size}-player</span>
            </span>
            <span className="display mt-2 text-2xl text-ink">{r.name}</span>
            <span className="mt-3 h-1 overflow-hidden rounded-full bg-surface-2">
              <span
                className="block h-full rounded-full bg-gradient-to-r from-gold-dim via-gold-bright to-void-bright"
                style={{ width: r.total ? `${(r.killed / r.total) * 100}%` : "0%" }}
              />
            </span>
            <span className="mt-2 flex items-baseline justify-between text-xs text-ink-dim">
              <span>{r.next ? `Next: ${r.next.when}` : "Nothing scheduled yet"}</span>
              <span className="num">
                {r.killed}/{r.total || "?"}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
