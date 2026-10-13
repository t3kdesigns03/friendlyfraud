"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { ROLE_LABELS } from "@/config/guild";
import { worldById } from "@/lib/scene/layout";
import { sceneStore, useScene } from "@/lib/scene/store";
import type { SceneData } from "@/lib/scene/types";
import { labelHost } from "./labelHost";

function lookup(id: string | null, data: SceneData) {
  if (!id) return null;
  if (id === "crest") return { kind: "crest" as const };
  const world = worldById(id);
  if (world) {
    const raid = world.kind === "raid" ? data.raids.find((r) => r.id === world.slug) ?? null : null;
    return { kind: "world" as const, world, raid };
  }
  if (id.startsWith("char:")) {
    const c = data.characters.find((x) => x.id === id.slice(5));
    return c ? { kind: "char" as const, c } : null;
  }
  return null;
}

/** Glass label that follows the hovered world / roster light. Desktop only. */
export function HoverLabel() {
  const hovered = useScene((s) => s.hovered);
  const active = useScene((s) => s.active);
  const data = useScene((s) => s.data);
  const hit = lookup(active ? null : hovered, data);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-30 hidden overflow-hidden md:block">
      <div
        ref={(el) => {
          labelHost.el = el;
        }}
        className="absolute top-0 left-0 will-change-transform"
        style={{ opacity: hit ? 1 : 0, transition: "opacity 220ms ease" }}
      >
        {hit && (
          <div className="glass -translate-y-3 rounded-xl px-3.5 py-2.5">
            {hit.kind === "world" && (
              <>
                <div className="flex items-center gap-2 whitespace-nowrap">
                  <span className="size-1.5 rounded-full" style={{ background: hit.world.color, boxShadow: `0 0 12px 1px ${hit.world.color}` }} />
                  <span className="display text-base leading-none text-ink">{hit.world.name}</span>
                  {hit.raid && (
                    <span className="num text-xs text-gold-bright">
                      {hit.raid.killed}/{hit.raid.total || "?"}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-[11px] text-ink-dim">
                  {hit.raid?.next ? `Next: ${hit.raid.next.when}` : hit.world.tagline}
                </p>
              </>
            )}
            {hit.kind === "char" && (
              <>
                <div className="flex items-center gap-2 whitespace-nowrap">
                  <span className="size-1.5 rounded-full" style={{ background: hit.c.color, boxShadow: `0 0 12px 1px ${hit.c.color}` }} />
                  <span className="text-sm leading-none font-semibold" style={{ color: hit.c.color }}>
                    {hit.c.name}
                  </span>
                  <span className="chip h-5 text-[10px]">{hit.c.isMain ? "Main" : "Alt"}</span>
                </div>
                <p className="mt-1 text-[11px] whitespace-nowrap text-ink-dim">
                  {hit.c.className} · {ROLE_LABELS[hit.c.role]}
                  {hit.c.memberName ? ` · ${hit.c.memberName}` : ""}
                  {hit.c.planned ? " · planned" : ""}
                </p>
              </>
            )}
            {hit.kind === "crest" && (
              <p className="text-xs whitespace-nowrap text-ink-dim">
                <span className="text-gold-bright">{data.characters.length}</span> characters circling the crest
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/** Slide-over for a raid world: bosses, progress, the next signup. */
export function WorldPanel() {
  const active = useScene((s) => s.active);
  const data = useScene((s) => s.data);
  const hit = lookup(active, data);
  const closeRef = useRef<HTMLButtonElement>(null);
  const open = hit?.kind === "world";

  useEffect(() => {
    if (!open) return;
    const restore = document.activeElement;
    const t = window.setTimeout(() => closeRef.current?.focus(), 60);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && sceneStore.setActive(null);
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("keydown", onKey);
      if (restore instanceof HTMLElement) restore.focus({ preventScroll: true });
    };
  }, [open]);

  const world = hit?.kind === "world" ? hit.world : null;
  const raid = hit?.kind === "world" ? hit.raid : null;

  return (
    <>
      <div
        onClick={() => sceneStore.setActive(null)}
        className={`fixed inset-0 z-50 bg-black/55 transition-opacity duration-300 ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-hidden={!open}
        aria-label={world ? `${world.name} details` : undefined}
        data-solid
        className={`glass fixed inset-y-0 right-0 z-50 flex w-full max-w-[26rem] flex-col overflow-y-auto overscroll-contain border-l px-6 pt-[calc(1.5rem+env(safe-area-inset-top))] pb-[calc(2rem+env(safe-area-inset-bottom))] transition-transform duration-500 ease-[cubic-bezier(.2,.8,.2,1)] sm:px-8 ${
          open ? "translate-x-0" : "pointer-events-none translate-x-full"
        }`}
      >
        {world && (
          <>
            <div className="flex items-start justify-between gap-4">
              <span className="mt-2 size-2.5 rounded-full" style={{ background: world.color, boxShadow: `0 0 22px 3px ${world.color}` }} />
              <button
                ref={closeRef}
                type="button"
                onClick={() => sceneStore.setActive(null)}
                className="-mt-1 -mr-2 flex min-h-11 items-center rounded-full px-3 text-[11px] tracking-[0.2em] text-ink-dim uppercase hover:text-ink"
              >
                close
              </button>
            </div>
            <div className="eyebrow mt-6">{world.tagline}</div>
            <h3 className="display mt-1 text-4xl text-ink">{world.name}</h3>

            {raid ? (
              <>
                <div className="mt-6 flex items-baseline justify-between">
                  <span className="text-sm text-ink-dim">Progress</span>
                  <span className="num text-2xl">
                    <span className={raid.total && raid.killed === raid.total ? "text-gold-bright" : "text-ink"}>{raid.killed}</span>
                    <span className="text-muted">/{raid.total || "?"}</span>
                  </span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-2">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-gold-dim via-gold-bright to-void-bright"
                    style={{ width: raid.total ? `${(raid.killed / raid.total) * 100}%` : "0%" }}
                  />
                </div>

                <h4 className="mt-8 text-[11px] font-semibold tracking-[0.14em] text-muted uppercase">Bosses</h4>
                {raid.bosses.length ? (
                  <ul className="mt-2 divide-y divide-line">
                    {raid.bosses.map((b) => (
                      <li key={b.name} className="flex items-center justify-between py-2.5 text-sm">
                        <span className={b.killed ? "text-ink" : "text-ink-dim"}>{b.name}</span>
                        <span className={`text-xs ${b.killed ? "text-gold-bright" : "text-muted"}`}>{b.killed ? "Defeated" : "Alive"}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-sm text-ink-dim">Encounters not announced yet.</p>
                )}

                <h4 className="mt-8 text-[11px] font-semibold tracking-[0.14em] text-muted uppercase">Next signup</h4>
                {raid.next ? (
                  <Link
                    href={`/events/${raid.next.id}`}
                    onClick={() => sceneStore.setActive(null)}
                    className="mt-2 block rounded-xl border border-gold-dim/50 bg-gold/5 p-4 transition-colors hover:border-gold"
                  >
                    <div className="font-semibold text-ink">{raid.next.title}</div>
                    <div className="mt-0.5 text-xs text-ink-dim">{raid.next.when}</div>
                    <div className="mt-3 flex items-center justify-between text-sm">
                      <span className="num">
                        <span className="text-yes">{raid.next.yes}</span>
                        {raid.next.cap ? <span className="text-muted">/{raid.next.cap}</span> : null}
                        {raid.next.maybe ? <span className="ml-2 text-maybe">+{raid.next.maybe}?</span> : null}
                      </span>
                      <span className="text-gold-bright">Sign up →</span>
                    </div>
                  </Link>
                ) : (
                  <p className="mt-2 text-sm text-ink-dim">Nothing scheduled yet.</p>
                )}
                <Link href="/progression" onClick={() => sceneStore.setActive(null)} className="btn mt-8 self-start">
                  Full progression
                </Link>
              </>
            ) : (
              <p className="mt-4 text-sm leading-relaxed text-ink-dim">
                One of Forever&apos;s new zones. No raid here — it&apos;s on the map so the sky matches the world you&apos;ll be
                flying over.
              </p>
            )}
          </>
        )}
      </aside>
    </>
  );
}

