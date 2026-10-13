"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { Component, useCallback, useEffect, useState } from "react";
import { GUILD_NAME, ROLE_LABELS } from "@/config/guild";
import { WORLDS, worldById } from "@/lib/scene/layout";
import { sceneStore, useScene } from "@/lib/scene/store";
import type { SceneData } from "@/lib/scene/types";
import { HoverLabel } from "../scene/Overlays";
import { hasWebGL, prefersReducedMotion } from "../scene/perf";
import { flight, flyTo, resetFlight } from "./flight";

const ExploreCanvas = dynamic(() => import("./ExploreCanvas"), { ssr: false, loading: () => null });

class Boundary extends Component<{ children: React.ReactNode; fallback: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(err: unknown) {
    console.warn("Explore could not start 3D; showing the static map.", err);
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/** No WebGL or reduced motion: the crest and the worlds as plain links. */
function StaticMap({ data }: { data: SceneData }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 px-6 text-center">
      <Image src="/crest-art.webp" alt="" width={1024} height={1024} className="h-auto w-[min(70vw,22rem)]" />
      <ul className="flex flex-wrap justify-center gap-2">
        {data.raids.map((r) => (
          <li key={r.id}>
            <Link href="/progression" className="btn min-h-11">
              {r.name} · {r.killed}/{r.total || "?"}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ExploreExperience({ data }: { data: SceneData }) {
  const [mode, setMode] = useState<"pending" | "3d" | "static">("pending");
  const [ready, setReady] = useState(false);
  const active = useScene((s) => s.active);
  const picked = useScene((s) => s.picked);
  const interacted = useScene((s) => s.interacted);
  const [touch, setTouch] = useState(false);

  useEffect(() => {
    sceneStore.setData(data);
  }, [data]);

  useEffect(() => {
    // decided after mount: the server can't know about WebGL or motion prefs
    const decide = () => {
      setTouch(window.matchMedia("(pointer: coarse)").matches);
      setMode(!hasWebGL() || prefersReducedMotion() ? "static" : "3d");
    };
    const id = window.requestAnimationFrame(decide);
    resetFlight();
    flight.pos.set(0, 3.2, 15);
    return () => {
      window.cancelAnimationFrame(id);
      sceneStore.setActive(null);
      sceneStore.setPicked(null);
      sceneStore.setHovered(null);
    };
  }, []);

  const onReady = useCallback(() => setReady(true), []);
  const world = worldById(active);
  const raid = world?.kind === "raid" ? data.raids.find((r) => r.id === world.slug) : null;
  const char = picked ? data.characters.find((c) => `char:${c.id}` === picked) : null;

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#07050b] select-none" style={{ touchAction: "none" }}>
      <div className={`absolute inset-0 transition-opacity duration-[1400ms] ${ready || mode === "static" ? "opacity-100" : "opacity-0"}`}>
        {mode === "3d" && (
          <Boundary fallback={<StaticMap data={data} />}>
            <ExploreCanvas onReady={onReady} calm={false} />
          </Boundary>
        )}
        {mode === "static" && <StaticMap data={data} />}
      </div>
      <div aria-hidden className="sky-vignette pointer-events-none absolute inset-0" />
      {mode === "3d" && <HoverLabel />}

      {/* top HUD */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-3 px-4 pt-[max(1rem,env(safe-area-inset-top))] sm:px-6">
        <Link href="/" aria-label={`${GUILD_NAME} home`} className="glass pointer-events-auto flex min-h-11 shrink-0 items-center gap-2 rounded-full p-1.5 sm:pr-4">
          <Image src="/crest-mark.webp" alt="" width={32} height={32} priority className="crest-mark rounded-full" />
          <span className="display hidden text-lg whitespace-nowrap text-ink sm:inline">{GUILD_NAME}</span>
        </Link>
        <div className="glass min-w-0 truncate rounded-full px-4 py-2.5 text-center text-[11px] tracking-[0.2em] whitespace-nowrap text-ink-dim uppercase">
          {world ? (
            <>
              <span className="hidden sm:inline">over </span>
              <span className="text-ink">{world.name}</span>
            </>
          ) : (
            "open sky"
          )}
        </div>
      </div>

      {/* hint */}
      {mode === "3d" && (
        <p
          className={`pointer-events-none absolute inset-x-0 top-24 text-center text-xs tracking-wide text-ink-dim transition-opacity duration-1000 ${
            ready && !interacted ? "opacity-100" : "opacity-0"
          }`}
        >
          {touch ? "tap a world · flick to fly · pinch to zoom" : "click a world · drag to fly · scroll to zoom"}
        </p>
      )}

      {/* bottom HUD: card + world chips */}
      {mode === "3d" && (
        <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-3 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {(raid || world || char) && (
            <div className="glass w-full max-w-md rounded-2xl p-4">
              {char ? (
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate font-semibold" style={{ color: char.color }}>
                      {char.name}
                    </div>
                    <div className="text-xs text-ink-dim">
                      {char.className} · {ROLE_LABELS[char.role]} · {char.isMain ? "Main" : "Alt"}
                      {char.memberName ? ` · ${char.memberName}` : ""}
                    </div>
                  </div>
                  <Link href={char.path} className="btn btn-sm min-h-11 shrink-0">
                    Profile →
                  </Link>
                </div>
              ) : world ? (
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="eyebrow">{world.tagline}</div>
                    <div className="display text-2xl text-ink">{world.name}</div>
                    {raid && (
                      <div className="mt-0.5 text-xs text-ink-dim">
                        <span className="num text-gold-bright">
                          {raid.killed}/{raid.total || "?"}
                        </span>{" "}
                        bosses · {raid.next ? `next ${raid.next.when}` : "nothing scheduled"}
                      </div>
                    )}
                  </div>
                  {raid?.next ? (
                    <Link href={`/events/${raid.next.id}`} className="btn btn-gold btn-sm min-h-11 shrink-0">
                      Sign up
                    </Link>
                  ) : raid ? (
                    <Link href="/progression" className="btn btn-sm min-h-11 shrink-0">
                      Details
                    </Link>
                  ) : null}
                </div>
              ) : null}
            </div>
          )}
          <nav aria-label="Fly to" className="-mx-4 max-w-full overflow-x-auto px-4 [scrollbar-width:none]">
            <ul className="flex w-max gap-2">
              <li>
                <button
                  type="button"
                  onClick={() => {
                    sceneStore.setPicked(null);
                    sceneStore.setInteracted();
                    flyTo("crest");
                  }}
                  className="glass flex min-h-11 items-center gap-2 rounded-full px-3.5 text-xs font-semibold text-gold-bright"
                >
                  <span className="size-1.5 rounded-full bg-gold-bright" /> Crest
                </button>
              </li>
              {WORLDS.map((w) => (
                <li key={w.id}>
                  <button
                    type="button"
                    onClick={() => {
                      sceneStore.setPicked(null);
                      sceneStore.setInteracted();
                      flyTo(w.id);
                    }}
                    className={`glass flex min-h-11 items-center gap-2 rounded-full px-3.5 text-xs font-semibold transition-colors ${
                      active === w.id ? "border-gold-dim text-ink" : "text-ink-dim hover:text-ink"
                    }`}
                  >
                    <span className="size-1.5 rounded-full" style={{ background: w.color, boxShadow: `0 0 8px ${w.color}` }} />
                    {w.name}
                  </button>
                </li>
              ))}
              <li>
                <button
                  type="button"
                  onClick={() => {
                    sceneStore.setPicked(null);
                    resetFlight();
                  }}
                  className="glass flex min-h-11 items-center rounded-full px-3.5 text-xs text-muted hover:text-ink"
                >
                  reset
                </button>
              </li>
            </ul>
          </nav>
        </div>
      )}
    </div>
  );
}
