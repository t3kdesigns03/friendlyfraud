"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { Crest } from "./Crest";
import { LabelTracker, Motes } from "./Motes";
import { Nebulae } from "./Nebulae";
import { Embers, Starfield, Vortex } from "./Particles";
import { Worlds } from "./Worlds";
import { TIERS, detectTier, isSmallScreen, type Tier } from "./perf";
import { CREST_POS, VORTEX_Y, orbit } from "@/lib/scene/layout";

/** Soft studio reflections for the crest's metal, generated locally (no HDR download). */
function Env() {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;
    scene.environmentIntensity = 0.32;
    return () => {
      scene.environment = null;
      env.dispose();
      pmrem.dispose();
    };
  }, [gl, scene]);
  return null;
}

/** Two seconds under 40fps → shed a particle tier and the bloom. */
function AdaptivePerf({ onDrop }: { onDrop: () => void }) {
  const a = useRef({ t: 0, frames: 0, bad: 0, warm: 0, done: false });
  useFrame((_, dt) => {
    const s = a.current;
    if (s.done) return;
    s.warm += dt;
    if (s.warm < 2.5) return;
    s.t += dt;
    s.frames++;
    if (s.t >= 1) {
      const fps = s.frames / s.t;
      s.t = 0;
      s.frames = 0;
      if (fps < 40) {
        if (++s.bad >= 2) {
          s.done = true;
          onDrop();
        }
      } else s.bad = 0;
    }
  });
  return null;
}

/** Fires once the first frames are on screen, so the page can fade the scene in. */
function Ready({ onReady }: { onReady: () => void }) {
  const n = useRef(0);
  useFrame(() => {
    if (++n.current === 3) onReady();
  });
  return null;
}

export type SceneCanvasProps = {
  /** camera + extras (rig, raven…) supplied by the page */
  children?: React.ReactNode;
  onOpenCharacter: (path: string, id: string) => void;
  onPickWorld?: (id: string) => void;
  /** listen for pointers on the whole page instead of just the canvas */
  pageEvents?: boolean;
  onReady?: () => void;
  fov?: number;
  /** /explore flies the full-size orbits on every screen */
  keepOrbits?: boolean;
};

export default function SceneCanvas({ children, onOpenCharacter, onPickWorld, pageEvents, onReady, fov = 42, keepOrbits }: SceneCanvasProps) {
  const [tier, setTier] = useState<Tier>(detectTier);
  const [bloom, setBloom] = useState(() => TIERS[detectTier()].bloom);
  const [awake, setAwake] = useState(true);
  const small = useMemo(() => isSmallScreen(), []);
  orbit.scale = keepOrbits ? 1 : small ? 0.62 : 0.82;
  const cfg = TIERS[tier];

  useEffect(() => {
    const onVis = () => setAwake(!document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  const drop = useCallback(() => {
    setBloom(false);
    setTier((t) => (t > 0 ? ((t - 1) as Tier) : t));
  }, []);

  return (
    <Canvas
      aria-hidden
      tabIndex={-1}
      // no tone mapping: the crest artwork must render exactly as drawn
      flat
      frameloop={awake ? "always" : "never"}
      dpr={[1, cfg.dpr]}
      gl={{ antialias: !bloom, alpha: false, stencil: false, powerPreference: "high-performance" }}
      camera={{ fov, near: 0.1, far: 300, position: [0, 4, 24] }}
      eventSource={pageEvents ? document.body : undefined}
      eventPrefix={pageEvents ? "client" : undefined}
      onCreated={({ gl }) => gl.setClearColor(new THREE.Color("#07050b"), 1)}
      style={{ position: "absolute", inset: 0, touchAction: pageEvents ? "pan-y" : "none" }}
    >
      <Suspense fallback={null}>
        <Env />
        <ambientLight intensity={0.16} color="#b8a6ff" />
        <Nebulae count={cfg.nebulae} frozen={false} />
        <Starfield count={cfg.stars} frozen={false} />
        <group position={[0, VORTEX_Y, 0]}>
          <Vortex count={cfg.vortex} core={cfg.core} dust={cfg.dust} frozen={false} />
        </group>
        <group position={[CREST_POS[0], VORTEX_Y, CREST_POS[2]]}>
          <Embers count={cfg.embers} frozen={false} />
        </group>
        <Crest shards={cfg.shards} frozen={false} />
        <Worlds segments={cfg.worldSegments} frozen={false} onPick={onPickWorld} />
        <Motes frozen={false} onOpen={onOpenCharacter} />
        <LabelTracker />
        {children}
        {onReady && <Ready onReady={onReady} />}
      </Suspense>
      {!small && <AdaptivePerf onDrop={drop} />}
      {bloom && !small && (
        <EffectComposer multisampling={0} enableNormalPass={false}>
          <Bloom mipmapBlur intensity={0.7} luminanceThreshold={0.8} luminanceSmoothing={0.25} radius={0.66} />
        </EffectComposer>
      )}
    </Canvas>
  );
}
