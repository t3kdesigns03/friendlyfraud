"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Component, useCallback, useEffect, useState } from "react";
import { sceneStore, useScene } from "@/lib/scene/store";
import type { SceneData } from "@/lib/scene/types";
import { HoverLabel, WorldPanel } from "./Overlays";
import { hasWebGL, isSmallScreen, staticOnly } from "./perf";

// The 3D bundle loads only on the homepage, after the content has painted.
const HomeCanvas = dynamic(() => import("./HomeCanvas"), { ssr: false, loading: () => null });

class Boundary extends Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(err: unknown) {
    console.warn("3D scene could not start; showing the static crest.", err);
    sceneStore.failWebgl();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

/**
 * Homepage sky. The content (and the static crest in the hero stage) paints
 * first; once the browser is idle the 3D scene loads behind it and fades in.
 * Reduced motion or no WebGL: the static crest simply stays.
 */
export function HomeScene({ data }: { data: SceneData }) {
  const router = useRouter();
  const [mount, setMount] = useState(false);
  const ready = useScene((s) => s.ready);

  useEffect(() => {
    sceneStore.setData(data);
  }, [data]);

  useEffect(() => {
    if (!hasWebGL()) return;
    const go = () => setMount(true);
    if (staticOnly()) {
      // respect reduced motion, but offer the cinematic (HomeHero shows the button)
      sceneStore.set("canOptIn", true);
      const optIn = () => {
        sceneStore.set("canOptIn", false);
        go();
      };
      window.addEventListener("ff-motion-on", optIn);
      return () => window.removeEventListener("ff-motion-on", optIn);
    }
    const idle = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number })
      .requestIdleCallback;
    const handle = idle ? idle(go, { timeout: 1200 }) : window.setTimeout(go, 300);
    return () => {
      if (!idle) window.clearTimeout(handle);
      sceneStore.setReady(false);
      sceneStore.setHovered(null);
      sceneStore.setActive(null);
    };
  }, []);

  const onReady = useCallback(() => sceneStore.setReady(true), []);
  const open = useCallback((path: string) => router.push(path), [router]);
  const small = typeof window !== "undefined" && isSmallScreen();

  return (
    <>
      <div aria-hidden className="fixed inset-0 z-0 overflow-hidden">
        {mount && (
          <div className={`absolute inset-0 transition-opacity duration-[1400ms] ${ready ? "opacity-100" : "opacity-0"}`}>
            <Boundary>
              <HomeCanvas onOpenCharacter={open} onReady={onReady} small={small} />
            </Boundary>
          </div>
        )}
      </div>
      <div aria-hidden className="sky-vignette pointer-events-none fixed inset-0 z-[1]" />
      <HoverLabel />
      <WorldPanel />
    </>
  );
}
