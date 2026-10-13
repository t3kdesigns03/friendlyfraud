"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { CREST_POS, MOTE_RING, worldById, worldPos } from "@/lib/scene/layout";
import { livePositions, raw, useScene } from "@/lib/scene/store";
import type { SceneCharacter } from "@/lib/scene/types";
import { labelHost } from "./labelHost";
import { pointerHandlers } from "./Worlds";

const TAU = Math.PI * 2;

/** Soft round glow sprite, drawn once. */
function glowTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.25, "rgba(255,255,255,0.55)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function Mote({
  c,
  index,
  total,
  frozen,
  sprite,
  onOpen,
}: {
  c: SceneCharacter;
  index: number;
  total: number;
  frozen: boolean;
  sprite: THREE.Texture;
  onOpen: (path: string, id: string) => void;
}) {
  const id = `char:${c.id}`;
  const group = useRef<THREE.Group>(null);
  const halo = useRef<THREE.Sprite>(null);
  const lit = useRef(0);
  const base = useMemo(() => {
    // stable per character: spread evenly, nudge radius/height by a hash
    let h = 0;
    for (const ch of c.id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    return {
      angle: (index / Math.max(1, total)) * TAU,
      r: MOTE_RING.radius + ((h % 100) / 100 - 0.5) * MOTE_RING.spread,
      y: (((h >> 8) % 100) / 100 - 0.5) * 0.7,
    };
  }, [c.id, index, total]);
  const color = useMemo(() => new THREE.Color(c.color), [c.color]);
  const size = c.isMain ? 0.14 : 0.1;

  useFrame((state, dt) => {
    const t = frozen ? 0 : state.clock.elapsedTime;
    const on = raw.hovered === id ? 1 : 0;
    lit.current = THREE.MathUtils.damp(lit.current, on, 7, dt);
    const a = base.angle + t * MOTE_RING.speed;
    const x = Math.cos(a) * base.r;
    const z = Math.sin(a) * base.r;
    // tilted orbit: behind the crest the lights ride over the top, in front
    // they pass under the point — they never cross the face of the art
    const y = base.y - z * MOTE_RING.tilt;
    const p: [number, number, number] = [CREST_POS[0] + x, CREST_POS[1] + y, CREST_POS[2] + z];
    livePositions.set(id, p);
    if (group.current) group.current.position.set(...p);
    if (halo.current) {
      const pulse = 1 + Math.sin(t * 2 + base.angle * 3) * 0.12;
      const s = (c.isMain ? 1.0 : 0.72) * pulse * (1 + lit.current * 1.8) * (c.planned ? 0.8 : 1);
      halo.current.scale.set(s, s, s);
      (halo.current.material as THREE.SpriteMaterial).opacity = (c.planned ? 0.55 : 0.85) + lit.current * 0.15;
    }
  });

  return (
    <group ref={group}>
      <mesh>
        <sphereGeometry args={[size, 12, 10]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      <sprite ref={halo}>
        <spriteMaterial map={sprite} color={color} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </sprite>
      <mesh {...pointerHandlers(id, () => onOpen(c.path, id))}>
        <sphereGeometry args={[0.45, 8, 6]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
      </mesh>
    </group>
  );
}

export function Motes({ frozen, onOpen }: { frozen: boolean; onOpen: (path: string, id: string) => void }) {
  const characters = useScene((s) => s.data.characters);
  const sprite = useMemo(() => glowTexture(), []);
  return (
    <>
      {characters.map((c, i) => (
        <Mote key={c.id} c={c} index={i} total={characters.length} frozen={frozen} sprite={sprite} onOpen={onOpen} />
      ))}
    </>
  );
}

/** Moves the DOM hover label to whatever is hovered, every frame. */
export function LabelTracker() {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const v = useMemo(() => new THREE.Vector3(), []);
  useFrame(() => {
    const el = labelHost.el;
    if (!el) return;
    const id = raw.hovered;
    if (!id || raw.active) return;
    const world = worldById(id);
    let lift = 0.5;
    if (world) {
      v.set(...worldPos(world));
      lift = world.radius * 1.5;
    } else if (id === "crest") {
      v.set(CREST_POS[0], CREST_POS[1] + 1.9, CREST_POS[2]);
      lift = 0;
    } else {
      const p = livePositions.get(id);
      if (!p) return;
      v.set(...p);
      lift = 0.25;
    }
    v.y += lift;
    v.project(camera);
    if (v.z > 1) return;
    const x = (v.x * 0.5 + 0.5) * size.width;
    const y = (-v.y * 0.5 + 0.5) * size.height;
    el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -100%)`;
  });
  return null;
}
