"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { dustFrag, pointsVert, starFrag } from "./shaders";
import { VORTEX_RADIUS as R } from "@/lib/scene/layout";

type Attribs = {
  position: Float32Array;
  aColor: Float32Array;
  aSize: Float32Array;
  aBright: Float32Array;
  aSeed: Float32Array;
};

const TAU = Math.PI * 2;
const gauss = (s: number) => {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v) * s;
};
const hex = (h: string): [number, number, number] => {
  const c = new THREE.Color(h);
  return [c.r, c.g, c.b];
};

function alloc(n: number): Attribs {
  return {
    position: new Float32Array(n * 3),
    aColor: new Float32Array(n * 3),
    aSize: new Float32Array(n),
    aBright: new Float32Array(n),
    aSeed: new Float32Array(n),
  };
}

function put(a: Attribs, i: number, p: [number, number, number], c: [number, number, number], size: number, bright: number) {
  a.position.set(p, i * 3);
  a.aColor.set(c, i * 3);
  a.aSize[i] = size;
  a.aBright[i] = bright;
  a.aSeed[i] = Math.random();
}

function PointLayer({
  attribs,
  uSize,
  rotSpeed = 0,
  shear = 0,
  twinkle = 0,
  rise = 0,
  riseSpan = 1,
  mode = "star",
  renderOrder = 0,
  frozen,
}: {
  attribs: Attribs;
  uSize: number;
  rotSpeed?: number;
  shear?: number;
  twinkle?: number;
  rise?: number;
  riseSpan?: number;
  mode?: "star" | "dust";
  renderOrder?: number;
  frozen: boolean;
}) {
  const mat = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uSize: { value: uSize },
      uPixelRatio: { value: 1 },
      uRotSpeed: { value: rotSpeed },
      uShear: { value: shear },
      uTwinkle: { value: twinkle },
      uFade: { value: 1 },
      uRise: { value: rise },
      uRiseSpan: { value: riseSpan },
    }),
    // built once; time and dpr are pushed per frame
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  useFrame((state) => {
    const m = mat.current;
    if (!m) return;
    if (!frozen) m.uniforms.uTime.value = state.clock.elapsedTime;
    m.uniforms.uPixelRatio.value = state.gl.getPixelRatio();
  });
  const n = attribs.aSize.length;
  if (!n) return null;
  return (
    <points frustumCulled={false} renderOrder={renderOrder}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[attribs.position, 3]} count={n} />
        <bufferAttribute attach="attributes-aColor" args={[attribs.aColor, 3]} count={n} />
        <bufferAttribute attach="attributes-aSize" args={[attribs.aSize, 1]} count={n} />
        <bufferAttribute attach="attributes-aBright" args={[attribs.aBright, 1]} count={n} />
        <bufferAttribute attach="attributes-aSeed" args={[attribs.aSeed, 1]} count={n} />
      </bufferGeometry>
      <shaderMaterial
        ref={mat}
        uniforms={uniforms}
        vertexShader={pointsVert}
        fragmentShader={mode === "dust" ? dustFrag : starFrag}
        transparent
        depthWrite={false}
        depthTest
        blending={mode === "dust" ? THREE.CustomBlending : THREE.AdditiveBlending}
        blendEquation={THREE.AddEquation}
        blendSrc={mode === "dust" ? THREE.ZeroFactor : THREE.SrcAlphaFactor}
        blendDst={mode === "dust" ? THREE.OneMinusSrcColorFactor : THREE.OneFactor}
      />
    </points>
  );
}

// ---------------------------------------------------------------------------
// The vortex: two arms out of one core. The gold arm burns like the crest's
// left half, the violet arm crackles like its shattered right half.
// ---------------------------------------------------------------------------

const ARMS = 2;
const PITCH = 0.42;
const armAngle = (arm: number, r: number) => (arm / ARMS) * TAU + Math.log(Math.max(0.06, r) / 0.3) / Math.tan(PITCH);

const GOLD = [hex("#ffd27a"), hex("#ffae4a"), hex("#ff8a3a"), hex("#fff1c9")];
const VOID = [hex("#a774ff"), hex("#7c4dff"), hex("#c9a8ff"), hex("#5b2fc9")];
const pick = (arr: [number, number, number][]) => arr[(Math.random() * arr.length) | 0];

function buildVortex(n: number): Attribs {
  const a = alloc(n);
  for (let i = 0; i < n; i++) {
    const arm = i % ARMS;
    const smooth = Math.random() < 0.3;
    const r0 = smooth ? Math.min(R, -Math.log(1 - Math.random() * 0.96) * 1.7) : Math.pow(Math.random(), 1.35) * R + 0.05;
    const spread = 0.14 + 0.75 * Math.pow(1 - Math.min(1, r0 / R), 0.8);
    const th = smooth ? Math.random() * TAU : armAngle(arm, r0) + gauss(spread);
    const r = r0 * (1 + gauss(0.05));
    const y = gauss(0.28 * Math.exp(-r0 / 1.8) + 0.03);
    const rn = Math.min(1, r / R);
    // core goes white-hot; arms carry their side's colour
    const base = arm === 0 ? pick(GOLD) : pick(VOID);
    const white = Math.pow(1 - rn, 3);
    const c: [number, number, number] = [
      base[0] + (1 - base[0]) * white,
      base[1] + (0.93 - base[1]) * white,
      base[2] + (0.8 - base[2]) * white,
    ];
    const big = Math.pow(Math.random(), 4.4);
    put(a, i, [Math.cos(th) * r, y, Math.sin(th) * r], c, 0.5 + big * 3.4, (0.42 + 0.6 * (1 - rn) + big * 0.7) * (smooth ? 0.6 : 1) * (0.75 + Math.random() * 0.5));
  }
  return a;
}

function buildCore(n: number): Attribs {
  const a = alloc(n);
  for (let i = 0; i < n; i++) {
    const rr = Math.pow(Math.random(), 2.4) * 1.3;
    const u = Math.random() * 2 - 1;
    const phi = Math.random() * TAU;
    const s = Math.sqrt(1 - u * u);
    const warm = Math.random();
    const c: [number, number, number] = warm < 0.5 ? [1, 0.86, 0.6] : warm < 0.8 ? [1, 0.95, 0.85] : [0.82, 0.7, 1];
    put(a, i, [s * Math.cos(phi) * rr, u * rr * 0.45, s * Math.sin(phi) * rr], c, 0.45 + Math.pow(Math.random(), 3) * 2.2, (0.45 + (1 - rr / 1.3) * 0.7) * (0.75 + Math.random() * 0.4));
  }
  return a;
}

function buildDust(n: number): Attribs {
  const a = alloc(n);
  for (let i = 0; i < n; i++) {
    const r0 = 0.5 + Math.pow(Math.random(), 0.9) * (R - 0.5);
    const th = armAngle(i % ARMS, r0) - 0.22 + gauss(0.1);
    const r = r0 * (1 + gauss(0.03));
    const v = 0.8 + Math.random() * 0.3;
    put(a, i, [Math.cos(th) * r, gauss(0.04) - 0.01, Math.sin(th) * r], [0.55 * v, 0.7 * v, 0.9 * v], 0.4 + Math.random(), (0.1 + Math.random() * 0.2) * (1 - 0.5 * (r0 / R)));
  }
  return a;
}

export function Vortex({ count, core, dust, frozen }: { count: number; core: number; dust: number; frozen: boolean }) {
  const v = useMemo(() => buildVortex(count), [count]);
  const c = useMemo(() => buildCore(core), [core]);
  const d = useMemo(() => buildDust(dust), [dust]);
  return (
    <group rotation={[0, 0, 0.06]}>
      <PointLayer attribs={c} uSize={24} rotSpeed={0.06} shear={0.05} renderOrder={0} frozen={frozen} />
      <PointLayer attribs={v} uSize={30} rotSpeed={0.055} shear={0.25} twinkle={0.06} renderOrder={1} frozen={frozen} />
      {dust > 0 && <PointLayer attribs={d} uSize={220} rotSpeed={0.055} shear={0.25} mode="dust" renderOrder={2} frozen={frozen} />}
    </group>
  );
}

// ---------------------------------------------------------------------------

function buildStars(n: number): Attribs {
  const a = alloc(n);
  for (let i = 0; i < n; i++) {
    const r = 55 + Math.random() * 70;
    const u = Math.random() * 2 - 1;
    const phi = Math.random() * TAU;
    const s = Math.sqrt(1 - u * u);
    const roll = Math.random();
    const c: [number, number, number] = roll < 0.5 ? [1, 0.86, 0.7] : roll < 0.85 ? [0.95, 0.93, 1] : [0.78, 0.68, 1];
    const big = Math.pow(Math.random(), 5);
    put(a, i, [s * Math.cos(phi) * r, u * r, s * Math.sin(phi) * r], c, 0.5 + big * 2.6, (0.22 + big * 0.7) * (0.6 + Math.random() * 0.7));
  }
  return a;
}

export function Starfield({ count, frozen }: { count: number; frozen: boolean }) {
  const attribs = useMemo(() => buildStars(count), [count]);
  const g = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (!frozen && g.current) g.current.rotation.y += dt * 0.004;
  });
  return (
    <group ref={g}>
      <PointLayer attribs={attribs} uSize={130} twinkle={0.12} renderOrder={-2} frozen={frozen} />
    </group>
  );
}

// ---------------------------------------------------------------------------
// Embers: gold sparks rise on the left, violet motes on the right — the
// crest's split, carried into the air around it.
// ---------------------------------------------------------------------------

function buildEmbers(n: number): Attribs {
  const a = alloc(n);
  for (let i = 0; i < n; i++) {
    const x = gauss(3.2);
    const gold = x < 0 ? Math.random() < 0.9 : Math.random() < 0.15;
    const c = gold ? pick(GOLD) : pick(VOID);
    put(a, i, [x, Math.random() * 7, gauss(2.4)], c, 0.8 + Math.pow(Math.random(), 3) * 2.6, 0.7 + Math.random() * 0.7);
  }
  return a;
}

export function Embers({ count, frozen }: { count: number; frozen: boolean }) {
  const attribs = useMemo(() => buildEmbers(count), [count]);
  return <PointLayer attribs={attribs} uSize={46} rise={0.32} riseSpan={7} twinkle={0.4} renderOrder={4} frozen={frozen} />;
}
