"use client";

import { Canvas, useThree } from "@react-three/fiber";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import { Suspense, useCallback, useEffect, useState } from "react";
import * as THREE from "three";
import { CREST_HEIGHT, CREST_POS, orbit } from "@/lib/scene/layout";
import { Crest } from "../scene/Crest";
import { Motes } from "../scene/Motes";
import { Nebulae, type Cloud } from "../scene/Nebulae";
import { Embers, Starfield, Vortex } from "../scene/Particles";
import { AdaptivePerf, Env, Ready } from "../scene/SceneCanvas";
import { TIERS, detectTier, type Tier } from "../scene/perf";
import { GalaxyRig, MarkerTracker, MountFlight } from "./Flight";
import { Corona, GalaxyWorlds } from "./GalaxyWorld";
import { galaxyScale } from "./layout";

/** The crest's split at cosmic scale: radiant gold to the west, violet shadowfel to the east. */
const SPACE: Cloud[] = [
  { position: [-55, 6, -20], rotation: [0, 0, 0], size: [120, 90], tint: "#4a2208", tint2: "#ffb85c", intensity: 0.2, scale: 2.0, seed: 3.1 },
  { position: [55, -2, -18], rotation: [0, 0, 0], size: [120, 90], tint: "#2c0f5c", tint2: "#a46bff", intensity: 0.24, scale: 2.1, seed: 9.7 },
  { position: [-30, -20, 30], rotation: [0, 0, 0], size: [90, 70], tint: "#3a1a06", tint2: "#ff9a3d", intensity: 0.1, scale: 2.6, seed: 21.4 },
  { position: [34, 22, 26], rotation: [0, 0, 0], size: [90, 70], tint: "#1f0b45", tint2: "#7c4dff", intensity: 0.12, scale: 2.4, seed: 44.2 },
  { position: [0, 30, -60], rotation: [0, 0, 0], size: [140, 90], tint: "#1a0c2e", tint2: "#cdb2ff", intensity: 0.07, scale: 1.6, seed: 63.5 },
];

/** Phones: render at most ~30 fps so the galaxy can't drain a battery. */
function FrameCap({ fps }: { fps: number }) {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    let id = 0;
    let last = 0;
    const tick = (now: number) => {
      id = requestAnimationFrame(tick);
      if (document.hidden) return;
      if (now - last >= 1000 / fps - 2) {
        last = now;
        invalidate();
      }
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [fps, invalidate]);
  return null;
}

export default function GalaxyCanvas({ small, calm, onReady, onOpenCharacter }: { small: boolean; calm: boolean; onReady: () => void; onOpenCharacter: (path: string) => void }) {
  const [tier, setTier] = useState<Tier>(detectTier);
  const [bloom, setBloom] = useState(() => TIERS[detectTier()].bloom && !small);
  const [awake, setAwake] = useState(true);
  const cfg = TIERS[tier];
  orbit.scale = 1;
  // portrait phones: squeeze the wide axis harder than the deep one
  Object.assign(galaxyScale, small ? { x: 0.48, y: 0.75, z: 0.66 } : { x: 1, y: 1, z: 1 });

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
      flat
      frameloop={!awake ? "never" : small ? "demand" : "always"}
      dpr={[1, small ? 1.25 : cfg.dpr]}
      gl={{ antialias: !bloom, alpha: false, stencil: false, powerPreference: small ? "low-power" : "high-performance" }}
      camera={{ fov: small ? 52 : 46, near: 0.1, far: 400, position: [0, 12, 60] }}
      onCreated={({ gl }) => gl.setClearColor(new THREE.Color("#05030a"), 1)}
      style={{ position: "absolute", inset: 0, touchAction: "none" }}
    >
      {small && <FrameCap fps={30} />}
      <Suspense fallback={null}>
        <Env />
        <ambientLight intensity={0.18} color="#b8a6ff" />
        <Nebulae count={small ? 3 : SPACE.length} frozen={false} clouds={SPACE} billboard />
        <Starfield count={Math.round(cfg.stars * 1.3)} frozen={false} />
        <group position={[0, -2.4, 0]} rotation={[0.08, 0, 0.05]}>
          <Vortex count={Math.round(cfg.vortex * 0.9)} core={cfg.core} dust={cfg.dust} frozen={false} radius={small ? 17 : 30} size={small ? 1.6 : 2.1} />
        </group>
        <group position={[CREST_POS[0], CREST_POS[1] - 4.5, CREST_POS[2]]}>
          <Embers count={cfg.embers} frozen={false} />
        </group>
        <Corona size={CREST_HEIGHT * 3.2} />
        <Crest shards={cfg.shards} frozen={false} />
        <Motes frozen={false} onOpen={onOpenCharacter} />
        <GalaxyWorlds segments={cfg.worldSegments} />
        <MountFlight small={small} calm={calm} />
        <GalaxyRig small={small} calm={calm} />
        <MarkerTracker />
        <Ready onReady={onReady} />
      </Suspense>
      {!small && <AdaptivePerf onDrop={drop} />}
      {bloom && (
        <EffectComposer multisampling={0} enableNormalPass={false}>
          <Bloom mipmapBlur intensity={0.75} luminanceThreshold={0.8} luminanceSmoothing={0.25} radius={0.7} />
        </EffectComposer>
      )}
    </Canvas>
  );
}
