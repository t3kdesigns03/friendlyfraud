"use client";

import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { ringFrag, ringVert, worldFrag, worldVert } from "./shaders";
import { LOOK_INDEX, SUN_POS, WORLDS, worldPos, type WorldSpot } from "@/lib/scene/layout";
import { raw, sceneStore } from "@/lib/scene/store";

/** The canvas listens on the whole page; ignore pointers that are over real UI. */
export function overUI(e: ThreeEvent<PointerEvent | MouseEvent>) {
  const t = e.nativeEvent.target as Element | null;
  return !!t?.closest?.("a, button, input, select, textarea, label, summary, [data-solid], .card, .glass");
}

export const pointerHandlers = (id: string, onClick?: () => void) => ({
  onPointerOver: (e: ThreeEvent<PointerEvent>) => {
    if (overUI(e)) return;
    e.stopPropagation();
    sceneStore.setHovered(id);
    document.body.style.cursor = "pointer";
  },
  onPointerMove: (e: ThreeEvent<PointerEvent>) => {
    if (overUI(e) && raw.hovered === id) {
      sceneStore.setHovered(null);
      document.body.style.cursor = "";
    }
  },
  onPointerOut: () => {
    if (raw.hovered === id) sceneStore.setHovered(null);
    document.body.style.cursor = "";
  },
  onClick: (e: ThreeEvent<MouseEvent>) => {
    if (overUI(e)) return;
    e.stopPropagation();
    if (onClick) onClick();
    else sceneStore.setActive(id);
  },
});

function Ring({ spot, lit }: { spot: WorldSpot; lit: React.RefObject<number> }) {
  const mat = useRef<THREE.ShaderMaterial>(null);
  const inner = spot.radius * 1.45;
  const outer = spot.radius * 2.25;
  const uniforms = useMemo(
    () => ({
      uColor: { value: new THREE.Color(spot.ring!.color) },
      uLit: { value: 0 },
      uInner: { value: inner },
      uOuter: { value: outer },
    }),
    [spot, inner, outer],
  );
  useFrame(() => {
    if (mat.current) mat.current.uniforms.uLit.value = lit.current;
  });
  return (
    <mesh rotation={[Math.PI / 2 - spot.ring!.tilt, 0, spot.ring!.tilt * 0.6]}>
      <ringGeometry args={[inner, outer, 96, 1]} />
      <shaderMaterial
        ref={mat}
        uniforms={uniforms}
        vertexShader={ringVert}
        fragmentShader={ringFrag}
        transparent
        depthWrite={false}
        side={THREE.DoubleSide}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}

function World({ spot, segments, frozen, onPick }: { spot: WorldSpot; segments: number; frozen: boolean; onPick?: (id: string) => void }) {
  const group = useRef<THREE.Group>(null);
  const body = useRef<THREE.Mesh>(null);
  const mat = useRef<THREE.ShaderMaterial>(null);
  const lit = useRef(0);
  const pos = worldPos(spot);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uLook: { value: LOOK_INDEX[spot.look] },
      uSeed: { value: spot.phase * 7.3 },
      uLit: { value: 0 },
      uAtmo: { value: new THREE.Color(spot.color) },
      uGlow: { value: new THREE.Color(spot.glow) },
      uLight: { value: new THREE.Vector3(...SUN_POS) },
    }),
    [spot],
  );

  useFrame((state, dt) => {
    const t = frozen ? 0 : state.clock.elapsedTime;
    const on = raw.hovered === spot.id || raw.active === spot.id ? 1 : 0;
    lit.current = THREE.MathUtils.damp(lit.current, on, 6, dt);
    if (group.current) {
      group.current.position.y = pos[1] + Math.sin(t * 0.3 + spot.phase) * 0.12;
      group.current.scale.setScalar(1 + lit.current * 0.22);
    }
    if (body.current && !frozen) body.current.rotation.y += dt * 0.06;
    if (mat.current) {
      mat.current.uniforms.uTime.value = t;
      mat.current.uniforms.uLit.value = lit.current;
    }
  });

  return (
    <group ref={group} position={pos}>
      <mesh ref={body}>
        <sphereGeometry args={[spot.radius, segments, Math.round(segments * 0.7)]} />
        <shaderMaterial ref={mat} uniforms={uniforms} vertexShader={worldVert} fragmentShader={worldFrag} />
      </mesh>
      {spot.ring && <Ring spot={spot} lit={lit} />}
      {/* invisible, generous hit volume so worlds are easy to hover and tap */}
      <mesh {...pointerHandlers(spot.id, onPick ? () => onPick(spot.id) : undefined)}>
        <sphereGeometry args={[spot.radius * 2.1, 12, 10]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
      </mesh>
    </group>
  );
}

export function Worlds({ segments, frozen, onPick }: { segments: number; frozen: boolean; onPick?: (id: string) => void }) {
  return (
    <>
      {WORLDS.map((w) => (
        <World key={w.id} spot={w} segments={segments} frozen={frozen} onPick={onPick} />
      ))}
    </>
  );
}
