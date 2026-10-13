"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Component, useCallback, useEffect, useRef, useState } from "react";
import { GUILD_NAME } from "@/config/guild";
import { CREST_STAR, GALAXY, KIND_LABEL, type WorldKind } from "@/config/worlds";
import type { GalaxyData } from "@/lib/galaxy/data";
import { sceneStore } from "@/lib/scene/store";
import { hasWebGL, isSmallScreen, optInToMotion, staticOnly } from "../scene/perf";
import { WorldPanelBody } from "./Panel";
import { HOME, flight, g, galaxy, markerEls, useGalaxy } from "./store";

const GalaxyCanvas = dynamic(() => import("./GalaxyCanvas"), { ssr: false, loading: () => null });

class Boundary extends Component<{ children: React.ReactNode; onFail: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(err: unknown) {
    console.warn("Galaxy could not start 3D; showing the static map.", err);
    this.props.onFail();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

type Entry = { id: string; name: string; kind: WorldKind | "home"; color: string; subtitle: string };
const ROMAN = ["I", "II", "III", "IV", "V", "VI"];
let uncharted = 0;
const ENTRIES: Entry[] = [
  { id: "crest", name: CREST_STAR.name, kind: "home", color: CREST_STAR.color, subtitle: CREST_STAR.subtitle },
  ...GALAXY.map((w) => ({
    id: w.id,
    // anomalies stay nameless until they are charted
    name: w.kind === "uncharted" ? `Uncharted ${ROMAN[uncharted++] ?? ""}`.trim() : w.name,
    kind: w.kind,
    color: w.color,
    subtitle: w.subtitle,
  })),
];
const kindLabel = (k: Entry["kind"]) => (k === "home" ? "Guild home" : KIND_LABEL[k]);

function titleOf(id: string | null) {
  return id ? (ENTRIES.find((e) => e.id === id)?.name ?? null) : null;
}

/** A tap target over a world. Mouse: hover labels, click flies. Touch: tap labels, tap again flies. */
function Marker({ e, touch }: { e: Entry; touch: React.RefObject<boolean> }) {
  const hovered = useGalaxy((s) => s.hovered === e.id);
  const armed = useGalaxy((s) => s.armed === e.id);
  const here = useGalaxy((s) => s.target === e.id && s.phase === "arrived");
  const show = (hovered || armed) && !here;
  return (
    <button
      type="button"
      ref={(el) => {
        if (el) markerEls.set(e.id, el);
        else markerEls.delete(e.id);
      }}
      aria-label={`${e.name} — ${kindLabel(e.kind)}. Fly here.`}
      onPointerEnter={(ev) => ev.pointerType === "mouse" && galaxy.set("hovered", e.id)}
      onPointerLeave={(ev) => ev.pointerType === "mouse" && g.hovered === e.id && galaxy.set("hovered", null)}
      onFocus={() => galaxy.set("hovered", e.id)}
      onBlur={() => g.hovered === e.id && galaxy.set("hovered", null)}
      onClick={() => {
        galaxy.set("interacted", true);
        if (touch.current && g.armed !== e.id) {
          galaxy.set("armed", e.id);
          return;
        }
        galaxy.flyTo(e.id);
      }}
      className="absolute top-0 left-0 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-gold-bright/70"
      style={{ visibility: "hidden", width: 48, height: 48 }}
    >
      <span
        className={`glass pointer-events-none absolute bottom-full left-1/2 mb-1 -translate-x-1/2 rounded-xl px-3 py-2 text-left whitespace-nowrap transition-opacity duration-200 ${
          show ? "opacity-100" : "opacity-0"
        }`}
      >
        <span className="flex items-center gap-2">
          <span className="size-1.5 rounded-full" style={{ background: e.color, boxShadow: `0 0 10px ${e.color}` }} />
          <span className="display text-[15px] leading-none text-ink">{e.name}</span>
        </span>
        <span className="mt-1 block text-[10px] tracking-[0.16em] text-ink-dim uppercase">
          {kindLabel(e.kind)}
          {armed ? " · tap again to fly" : ""}
        </span>
      </span>
    </button>
  );
}

/** Reduced motion / no WebGL: stars, the crest, and every world as a button. */
function StaticGalaxy({ open, onPlay }: { open: (id: string) => void; onPlay?: () => void }) {
  return (
    <div className="static-stars flex h-full flex-col items-center justify-center gap-6 overflow-y-auto px-5 pt-20 pb-28 text-center">
      {onPlay && (
        <button type="button" onClick={onPlay} className="glass flex min-h-11 items-center gap-2 rounded-full px-5 text-sm font-semibold text-void-bright">
          <span className="size-1.5 rounded-full bg-void-bright shadow-[0_0_8px_var(--void)]" /> Play the cinematic
        </button>
      )}
      <Image src="/crest-art.webp" alt={`${GUILD_NAME} crest`} width={1024} height={1024} className="h-auto w-[min(62vw,20rem)]" priority />
      <ul className="flex max-w-xl flex-wrap justify-center gap-2">
        {ENTRIES.map((e) => (
          <li key={e.id}>
            <button type="button" onClick={() => open(e.id)} className="glass flex min-h-11 items-center gap-2 rounded-full px-4 text-sm text-ink">
              <span className="size-1.5 rounded-full" style={{ background: e.color }} />
              {e.name}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function GalaxyExperience({ data }: { data: GalaxyData }) {
  const router = useRouter();
  const [mode, setMode] = useState<"pending" | "3d" | "static">("pending");
  const [small, setSmall] = useState(false);
  const [staticOpen, setStaticOpen] = useState<string | null>(null);
  const ready = useGalaxy((s) => s.ready);
  const phase = useGalaxy((s) => s.phase);
  const target = useGalaxy((s) => s.target);
  const interacted = useGalaxy((s) => s.interacted);
  const touch = useRef(false);

  useEffect(() => {
    sceneStore.setData(data.scene);
  }, [data]);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      setSmall(isSmallScreen());
      setMode(!hasWebGL() || staticOnly() ? "static" : "3d");
    });
    // fresh visit: start at home, overview
    flight.pos.copy(HOME);
    flight.t = 1;
    flight.zoom = 1;
    galaxy.set("target", null);
    galaxy.set("phase", "overview");
    const note = (e: PointerEvent) => (touch.current = e.pointerType !== "mouse");
    window.addEventListener("pointerdown", note, true);
    const wheel = (e: WheelEvent) => {
      // scroll nudges the camera in and out
      flight.zoom = Math.min(1.6, Math.max(0.6, flight.zoom * Math.exp(e.deltaY * 0.0009)));
    };
    window.addEventListener("wheel", wheel, { passive: true });
    const key = (e: KeyboardEvent) => e.key === "Escape" && g.target && galaxy.flyTo(null);
    window.addEventListener("keydown", key);
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener("pointerdown", note, true);
      window.removeEventListener("wheel", wheel);
      window.removeEventListener("keydown", key);
      galaxy.set("ready", false);
    };
  }, []);

  const onReady = useCallback(() => galaxy.set("ready", true), []);
  const onOpenCharacter = useCallback((path: string) => router.push(path), [router]);

  const panelId = mode === "static" ? staticOpen : phase === "arrived" ? target : null;
  const where =
    phase === "flying" && target ? `en route · ${titleOf(target)}` : phase === "arrived" && target ? titleOf(target) : "deep space";

  return (
    <div
      className="fixed inset-0 overflow-hidden bg-[#05030a] select-none"
      style={{ touchAction: "none" }}
      onClick={(e) => {
        // tap on empty space disarms a label
        if (e.target === e.currentTarget && g.armed) galaxy.set("armed", null);
      }}
    >
      <div className={`absolute inset-0 transition-opacity duration-[1400ms] ${ready || mode === "static" ? "opacity-100" : "opacity-0"}`}>
        {mode === "3d" && (
          <Boundary onFail={() => setMode("static")}>
            <GalaxyCanvas small={small} calm={false} onReady={onReady} onOpenCharacter={onOpenCharacter} />
          </Boundary>
        )}
        {mode === "static" && (
          <StaticGalaxy
            open={setStaticOpen}
            onPlay={
              hasWebGL()
                ? () => {
                    optInToMotion();
                    setStaticOpen(null);
                    setMode("3d");
                  }
                : undefined
            }
          />
        )}
      </div>
      <div aria-hidden className="sky-vignette pointer-events-none absolute inset-0" />

      {/* tap targets over the worlds, positioned by the scene */}
      {mode === "3d" && (
        <div
          className="absolute inset-0 overflow-hidden"
          onClick={(e) => {
            if (e.target === e.currentTarget && g.armed) galaxy.set("armed", null);
          }}
          style={{ pointerEvents: "none" }}
        >
          <div className="pointer-events-auto">
            {ENTRIES.map((e) => (
              <Marker key={e.id} e={e} touch={touch} />
            ))}
          </div>
        </div>
      )}

      {/* top HUD */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-3 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-6">
        <Link href="/" aria-label={`${GUILD_NAME} home`} className="glass pointer-events-auto flex min-h-11 shrink-0 items-center gap-2 rounded-full p-1.5 sm:pr-4">
          <Image src="/crest-mark.webp" alt="" width={32} height={32} priority className="crest-mark rounded-full" />
          <span className="display hidden text-lg whitespace-nowrap text-ink sm:inline">{GUILD_NAME}</span>
        </Link>
        <div className="glass min-w-0 truncate rounded-full px-4 py-2.5 text-center text-[11px] tracking-[0.2em] whitespace-nowrap text-ink-dim uppercase">
          {where}
        </div>
      </div>

      {mode === "3d" && (
        <p
          className={`pointer-events-none absolute inset-x-0 top-20 z-10 text-center text-xs tracking-wide text-ink-dim transition-opacity duration-1000 ${
            ready && !interacted ? "opacity-100" : "opacity-0"
          }`}
        >
          {small ? "tap a world to see it · tap again to fly" : "hover a world · click to fly · scroll to zoom"}
        </p>
      )}

      {/* panel: side sheet on desktop, bottom sheet on phones */}
      <aside
        aria-live="polite"
        aria-hidden={!panelId}
        data-solid
        className={`glass absolute z-30 overflow-y-auto overscroll-contain transition-transform duration-500 ease-[cubic-bezier(.2,.8,.2,1)] ${
          small || mode === "static"
            ? `inset-x-0 bottom-0 max-h-[56svh] rounded-t-3xl border-t px-5 pt-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] ${panelId ? "translate-y-0" : "translate-y-full"}`
            : `top-0 right-0 bottom-0 w-[26rem] border-l px-7 pt-20 pb-28 ${panelId ? "translate-x-0" : "translate-x-full"}`
        }`}
      >
        {panelId && (
          <>
            <div className="mb-2 flex justify-end">
              <button
                type="button"
                onClick={() => (mode === "static" ? setStaticOpen(null) : galaxy.flyTo(null))}
                className="-mr-2 flex min-h-11 items-center rounded-full px-3 text-[11px] tracking-[0.2em] text-ink-dim uppercase hover:text-ink"
              >
                {mode === "static" ? "close" : "fly home"}
              </button>
            </div>
            <WorldPanelBody id={panelId} data={data} />
          </>
        )}
      </aside>

      {/* bottom: quick-fly chips */}
      <nav aria-label="Fly to" className="absolute inset-x-0 bottom-0 z-40 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <ul className="mx-auto flex w-max max-w-full gap-2 overflow-x-auto pb-1 [scrollbar-width:none]" style={{ touchAction: "pan-x" }}>
          {ENTRIES.map((e) => (
            <li key={e.id}>
              <button
                type="button"
                onClick={() => (mode === "static" ? setStaticOpen(e.id) : galaxy.flyTo(e.id))}
                className={`glass flex min-h-11 items-center gap-2 rounded-full px-3.5 text-xs font-semibold whitespace-nowrap transition-colors ${
                  target === e.id && phase !== "overview" ? "border-gold-dim text-ink" : "text-ink-dim hover:text-ink"
                }`}
              >
                <span className="size-1.5 rounded-full" style={{ background: e.color, boxShadow: `0 0 8px ${e.color}` }} />
                {e.name}
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
