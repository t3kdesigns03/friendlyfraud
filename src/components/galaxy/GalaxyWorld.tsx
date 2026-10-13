"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { GALAXY, type GalaxyWorld, type WorldLook } from "@/config/worlds";
import { CREST_POS } from "@/lib/scene/layout";
import { quadVert, ringFrag, ringVert, worldFrag, worldVert } from "../scene/shaders";
import { g } from "./store";
import { worldPosition } from "./layout";

const riftFrag = /* glsl */ `
  uniform float uTime;
  uniform float uLit;
  uniform vec3 uA;
  uniform vec3 uB;
  varying vec2 vUv;
  void main() {
    vec2 p = (vUv - 0.5) * 2.0;
    float r = length(p);
    float a = atan(p.y, p.x);
    // a slow spiral rift: shimmering arms around a lightless eye
    float arms = sin(a * 3.0 - log(r + 0.02) * 7.0 + uTime * 1.3) * 0.5 + 0.5;
    float fine = sin(a * 11.0 + log(r + 0.02) * 15.0 - uTime * 2.1) * 0.5 + 0.5;
    float band = smoothstep(0.18, 0.42, r) * (1.0 - smoothstep(0.62, 1.0, r));
    float s = pow(arms, 2.2) * (0.7 + 0.3 * fine) * band;
    vec3 col = mix(uA, uB, arms) * s * (1.4 + uLit * 0.8);
    gl_FragColor = vec4(col, s);
    #include <colorspace_fragment>
  }
`;

/** The swirl that marks an uncharted world as a rift, not a planet. */
function Rift({ w, lit }: { w: GalaxyWorld; lit: React.RefObject<number> }) {
  const mesh = useRef<THREE.Mesh>(null);
  const mat = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(() => ({ uTime: { value: 0 }, uLit: { value: 0 }, uA: { value: new THREE.Color(w.color) }, uB: { value: new THREE.Color(w.glow) } }), [w]);
  useFrame((state) => {
    if (mesh.current) mesh.current.quaternion.copy(state.camera.quaternion);
    if (mat.current) {
      mat.current.uniforms.uTime.value = state.clock.elapsedTime;
      mat.current.uniforms.uLit.value = lit.current;
    }
  });
  const s = w.radius * 5.2;
  return (
    <mesh ref={mesh} renderOrder={3}>
      <planeGeometry args={[s, s]} />
      <shaderMaterial ref={mat} uniforms={uniforms} vertexShader={quadVert} fragmentShader={riftFrag} transparent depthWrite={false} blending={THREE.AdditiveBlending} />
    </mesh>
  );
}

/** Look → index in the shared world shader. */
export const GALAXY_LOOKS: Record<WorldLook, number> = { magma: 0, frost: 1, barrow: 2, ember: 5, mist: 6, gale: 7, anomaly: 8 };

function glowTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const ctx = c.getContext("2d")!;
  const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, "rgba(255,255,255,0.9)");
  grad.addColorStop(0.3, "rgba(255,255,255,0.35)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function Body({ w, segments, sprite }: { w: GalaxyWorld; segments: number; sprite: THREE.Texture }) {
  const group = useRef<THREE.Group>(null);
  const body = useRef<THREE.Mesh>(null);
  const mat = useRef<THREE.ShaderMaterial>(null);
  const ringMat = useRef<THREE.ShaderMaterial>(null);
  const halo = useRef<THREE.Sprite>(null);
  const lit = useRef(0);
  const uncharted = w.kind === "uncharted";
  const phase = useMemo(() => (w.position[0] * 0.37 + w.position[2] * 0.21) % (Math.PI * 2), [w]);
  const pos = useMemo(() => worldPosition(w).toArray() as [number, number, number], [w]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uLook: { value: GALAXY_LOOKS[w.look] },
      uSeed: { value: phase * 7.3 },
      uLit: { value: 0 },
      uAtmo: { value: new THREE.Color(w.color) },
      uGlow: { value: new THREE.Color(w.glow) },
      uLight: { value: new THREE.Vector3(...CREST_POS) },
    }),
    [w, phase],
  );
  const inner = w.radius * 1.45;
  const outer = w.radius * 2.25;
  const ringUniforms = useMemo(
    () =>
      w.ring
        ? { uColor: { value: new THREE.Color(w.ring.color) }, uLit: { value: 0 }, uInner: { value: inner }, uOuter: { value: outer } }
        : null,
    [w, inner, outer],
  );

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    const on = g.hovered === w.id || g.armed === w.id || (g.target === w.id && g.phase !== "overview") ? 1 : 0;
    lit.current = THREE.MathUtils.damp(lit.current, on, 6, dt);
    if (group.current) {
      group.current.position.y = pos[1] + Math.sin(t * 0.3 + phase) * 0.25;
      const pulse = uncharted ? 1 + Math.sin(t * 1.4 + phase) * 0.06 : 1;
      group.current.scale.setScalar(pulse * (1 + lit.current * 0.15));
    }
    if (body.current) body.current.rotation.y += dt * (uncharted ? 0.25 : 0.05);
    if (mat.current) {
      mat.current.uniforms.uTime.value = t;
      mat.current.uniforms.uLit.value = lit.current;
    }
    if (ringMat.current) ringMat.current.uniforms.uLit.value = lit.current;
    if (halo.current) {
      const s = w.radius * (uncharted ? 3.4 : 4.2) * (1 + lit.current * 0.35) * (uncharted ? 1 + Math.sin(t * 0.9 + phase) * 0.12 : 1);
      halo.current.scale.set(s, s, s);
      (halo.current.material as THREE.SpriteMaterial).opacity = (uncharted ? 0.3 : 0.22) + lit.current * 0.25;
    }
  });

  return (
    <group ref={group} position={pos}>
      <sprite ref={halo}>
        <spriteMaterial map={sprite} color={w.color} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </sprite>
      {uncharted && <Rift w={w} lit={lit} />}
      <mesh ref={body} scale={uncharted ? 0.55 : 1}>
        <sphereGeometry args={[w.radius, segments, Math.round(segments * 0.7)]} />
        <shaderMaterial ref={mat} uniforms={uniforms} vertexShader={worldVert} fragmentShader={worldFrag} />
      </mesh>
      {w.ring && ringUniforms && (
        <mesh rotation={[Math.PI / 2 - w.ring.tilt, 0, w.ring.tilt * 0.6]}>
          <ringGeometry args={[inner, outer, 96, 1]} />
          <shaderMaterial
            ref={ringMat}
            uniforms={ringUniforms}
            vertexShader={ringVert}
            fragmentShader={ringFrag}
            transparent
            depthWrite={false}
            side={THREE.DoubleSide}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      )}
    </group>
  );
}

export function GalaxyWorlds({ segments }: { segments: number }) {
  const sprite = useMemo(() => glowTexture(), []);
  return (
    <>
      {GALAXY.map((w) => (
        <Body key={w.id} w={w} segments={segments} sprite={sprite} />
      ))}
    </>
  );
}

const coronaFrag = /* glsl */ `
  uniform float uTime;
  uniform float uLit;
  varying vec2 vUv;
  void main() {
    vec2 p = vUv - 0.5;
    float r = length(p);
    float a = atan(p.y, p.x);
    // soft corona + slowly turning rays, gold on the left, violet on the right
    float core = exp(-r * r * 26.0);
    float rays = pow(0.5 + 0.5 * sin(a * 9.0 + uTime * 0.15) * sin(a * 5.0 - uTime * 0.1), 6.0) * exp(-r * 5.0);
    float g = (core * 0.9 + rays * 0.55) * (1.0 - smoothstep(0.32, 0.5, r));
    vec3 col = mix(vec3(1.0, 0.7, 0.28), vec3(0.6, 0.32, 1.0), smoothstep(-0.15, 0.15, p.x));
    float pulse = 0.85 + 0.15 * sin(uTime * 0.7) + uLit * 0.25;
    gl_FragColor = vec4(col * g * pulse, g * pulse);
    #include <colorspace_fragment>
  }
`;

/** The burning light behind the crest — what makes it a star. */
export function Corona({ size }: { size: number }) {
  const mesh = useRef<THREE.Mesh>(null);
  const mat = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(() => ({ uTime: { value: 0 }, uLit: { value: 0 } }), []);
  useFrame((state, dt) => {
    if (mesh.current) mesh.current.quaternion.copy(state.camera.quaternion);
    if (mat.current) {
      mat.current.uniforms.uTime.value = state.clock.elapsedTime;
      const on = g.hovered === "crest" || g.armed === "crest" || (g.target === "crest" && g.phase !== "overview") ? 1 : 0;
      mat.current.uniforms.uLit.value = THREE.MathUtils.damp(mat.current.uniforms.uLit.value, on, 5, dt);
    }
  });
  return (
    <mesh ref={mesh} position={CREST_POS} renderOrder={4}>
      <planeGeometry args={[size, size]} />
      <shaderMaterial
        ref={mat}
        uniforms={uniforms}
        vertexShader={quadVert}
        fragmentShader={coronaFrag}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}
