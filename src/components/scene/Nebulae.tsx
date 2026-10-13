"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { nebulaFrag, quadVert } from "./shaders";

type Cloud = {
  position: [number, number, number];
  rotation: [number, number, number];
  size: [number, number];
  tint: string;
  tint2: string;
  intensity: number;
  scale: number;
  seed: number;
};

/** Smoke behind the vortex: ember gold on the left, void violet on the right. */
const CLOUDS: Cloud[] = [
  { position: [16, 3, -30], rotation: [0.1, -0.4, 0.3], size: [58, 44], tint: "#3d1670", tint2: "#a46bff", intensity: 0.16, scale: 2.0, seed: 11.4 },
  { position: [-18, 2, -32], rotation: [-0.1, 0.45, -0.25], size: [56, 42], tint: "#5a2a08", tint2: "#ffb35c", intensity: 0.11, scale: 2.4, seed: 47.9 },
  { position: [2, 14, -44], rotation: [0.05, 0.1, 0.8], size: [76, 52], tint: "#24104a", tint2: "#7c4dff", intensity: 0.09, scale: 1.7, seed: 82.2 },
  { position: [-6, -12, -28], rotation: [0.2, 0.3, -0.5], size: [48, 36], tint: "#3a1a10", tint2: "#ff7a3d", intensity: 0.06, scale: 3.0, seed: 5.7 },
];

function CloudMesh({ cloud, frozen }: { cloud: Cloud; frozen: boolean }) {
  const mat = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uTint: { value: new THREE.Color(cloud.tint) },
      uTint2: { value: new THREE.Color(cloud.tint2) },
      uIntensity: { value: cloud.intensity },
      uSeed: { value: cloud.seed },
      uScale: { value: cloud.scale },
    }),
    [cloud],
  );
  useFrame((s) => {
    if (!frozen && mat.current) mat.current.uniforms.uTime.value = s.clock.elapsedTime;
  });
  return (
    <mesh position={cloud.position} rotation={cloud.rotation} renderOrder={-3} frustumCulled={false}>
      <planeGeometry args={cloud.size} />
      <shaderMaterial
        ref={mat}
        uniforms={uniforms}
        vertexShader={quadVert}
        fragmentShader={nebulaFrag}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}

export function Nebulae({ count, frozen }: { count: number; frozen: boolean }) {
  return (
    <>
      {CLOUDS.slice(0, count).map((c, i) => (
        <CloudMesh key={i} cloud={c} frozen={frozen} />
      ))}
    </>
  );
}
