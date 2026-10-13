"use client";

import { useFrame, useLoader } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { CREST_HEIGHT, CREST_POS } from "@/lib/scene/layout";
import { raw, sceneStore } from "@/lib/scene/store";

/**
 * The guild crest, exactly as drawn: the full artwork on a plane, no crop,
 * no relight, no tone mapping. Its alpha matte (scripts/build-crest.mjs)
 * keeps the whole shield opaque and lets only the black backdrop go clear,
 * so the spikes, crystals, smoke and embers float in the sky.
 */
const crestVert = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const crestFrag = /* glsl */ `
  uniform sampler2D uMap;
  uniform float uLit;
  varying vec2 vUv;
  void main() {
    // alpha is baked into the artwork by scripts/build-crest.mjs
    vec4 c = texture2D(uMap, vUv);
    if (c.a < 0.004) discard;
    gl_FragColor = vec4(c.rgb * (1.0 + uLit * 0.12), c.a);
    #include <colorspace_fragment>
  }
`;

/** Soft light behind the crest: ember gold on the left, void violet on the right. */
const glowFrag = /* glsl */ `
  uniform float uTime;
  varying vec2 vUv;
  void main() {
    vec2 p = vUv - 0.5;
    float r = length(p);
    // gaussian that reaches exactly zero before the plane edge (no visible square)
    float g = exp(-r * r * 11.0) * 0.55 * (1.0 - smoothstep(0.3, 0.5, r));
    vec3 gold = vec3(1.0, 0.68, 0.24);
    vec3 voidc = vec3(0.55, 0.3, 1.0);
    vec3 col = mix(gold, voidc, smoothstep(-0.12, 0.12, p.x));
    float pulse = 0.85 + 0.15 * sin(uTime * 0.8);
    gl_FragColor = vec4(col * g * pulse, g * pulse);
    #include <colorspace_fragment>
  }
`;

/** Side length of the artwork plane; the shield fills ~88% of it. */
export const ART_SIZE = CREST_HEIGHT / 0.88;

function Shield() {
  const tex = useLoader(THREE.TextureLoader, "/crest-art.webp");
  const glow = useRef<THREE.ShaderMaterial>(null);
  const art = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(() => {
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    tex.generateMipmaps = true;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    return { uMap: { value: tex }, uLit: { value: 0 } };
  }, [tex]);
  const glowUniforms = useMemo(() => ({ uTime: { value: 0 } }), []);

  useFrame((state, dt) => {
    if (glow.current) glow.current.uniforms.uTime.value = state.clock.elapsedTime;
    if (art.current) {
      art.current.uniforms.uLit.value = THREE.MathUtils.damp(art.current.uniforms.uLit.value, raw.hovered === "crest" ? 1 : 0, 5, dt);
    }
  });

  return (
    <>
      <mesh position={[0, 0, -0.35]} renderOrder={5}>
        <planeGeometry args={[ART_SIZE * 1.9, ART_SIZE * 1.9]} />
        <shaderMaterial
          ref={glow}
          uniforms={glowUniforms}
          vertexShader={crestVert}
          fragmentShader={glowFrag}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      <mesh
        renderOrder={6}
        onPointerOver={(e) => {
          e.stopPropagation();
          sceneStore.setHovered("crest");
        }}
        onPointerOut={() => sceneStore.setHovered(null)}
      >
        <planeGeometry args={[ART_SIZE, ART_SIZE]} />
        <shaderMaterial ref={art} uniforms={uniforms} vertexShader={crestVert} fragmentShader={crestFrag} transparent depthWrite={false} toneMapped={false} />
      </mesh>
    </>
  );
}

/**
 * Violet crystal shards breaking off the void half: they orbit the right
 * side, drift outward, fade and re-form against the shield.
 */
function Shards({ count, frozen }: { count: number; frozen: boolean }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const seeds = useMemo(
    () =>
      Array.from({ length: count }, () => ({
        a0: -1.1 + Math.random() * 2.3, // angle around the shield's right side
        r0: 1.15 + Math.random() * 0.5,
        y0: (Math.random() - 0.5) * 2.6,
        speed: 0.05 + Math.random() * 0.09,
        size: 0.06 + Math.random() * 0.12,
        spin: (Math.random() - 0.5) * 2,
        phase: Math.random(),
      })),
    [count],
  );
  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color("#2a1452"),
        emissive: new THREE.Color("#8d55ff"),
        emissiveIntensity: 1.35,
        roughness: 0.2,
        metalness: 0.4,
        flatShading: true,
      }),
    [],
  );
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame((state) => {
    const m = mesh.current;
    if (!m) return;
    const t = frozen ? 0 : state.clock.elapsedTime;
    seeds.forEach((s, i) => {
      // life 0..1: break away from the shield, drift out, fade, repeat
      const life = (s.phase + t * s.speed) % 1;
      const out = s.r0 + life * 1.6;
      const ang = s.a0 + life * 0.6;
      // born behind the void edge, drifting out to the right — never across the art
      dummy.position.set(1.45 + Math.abs(Math.cos(ang)) * (out - 1.0) * 1.1, s.y0 + Math.sin(t * 0.6 + i) * 0.08 + life * 0.4, -0.25 - Math.abs(Math.sin(ang)) * out * 0.45);
      dummy.rotation.set(t * s.spin, t * s.spin * 0.7 + i, 0.3 + i);
      const fade = Math.sin(Math.PI * Math.min(1, life * 1.15));
      dummy.scale.set(s.size * fade, s.size * 3.2 * fade, s.size * fade);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, count]} material={material} frustumCulled={false}>
      <octahedronGeometry args={[1, 0]} />
    </instancedMesh>
  );
}

export function Crest({ shards, frozen }: { shards: number; frozen: boolean }) {
  const group = useRef<THREE.Group>(null);
  const lit = useRef(0);

  useFrame((state, dt) => {
    const g = group.current;
    if (!g) return;
    const t = frozen ? 0 : state.clock.elapsedTime;
    lit.current = THREE.MathUtils.damp(lit.current, raw.hovered === "crest" ? 1 : 0, 5, dt);
    // slow sway plus a lean toward the pointer
    const px = frozen ? 0 : state.pointer.x;
    const py = frozen ? 0 : state.pointer.y;
    // always turn to face the camera as it orbits, plus the sway
    const face = Math.atan2(state.camera.position.x - g.position.x, state.camera.position.z - g.position.z);
    g.rotation.y = THREE.MathUtils.damp(g.rotation.y, face + Math.sin(t * 0.25) * 0.07 + px * 0.1, 3, dt);
    g.rotation.x = THREE.MathUtils.damp(g.rotation.x, -py * 0.05 + Math.sin(t * 0.18) * 0.02, 3, dt);
    g.position.y = CREST_POS[1] + Math.sin(t * 0.6) * 0.08;
    g.scale.setScalar(1 + lit.current * 0.04);
  });

  return (
    <group ref={group} position={CREST_POS}>
      <Shield />
      <group scale={CREST_HEIGHT / 3.4}>
        <Shards count={shards} frozen={frozen} />
      </group>
      {/* gold key from the left, void light from the right — the crest's split */}
      <pointLight position={[-3.4, 1.6, 3.2]} color="#ffc56a" intensity={22} distance={12} decay={1.6} />
      <pointLight position={[3.4, 0.5, 3.0]} color="#9b5cff" intensity={26} distance={12} decay={1.6} />
    </group>
  );
}
