"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { CREST_HEIGHT, CREST_POS, worldById, worldPos } from "@/lib/scene/layout";
import { sceneStore } from "@/lib/scene/store";
import { START, flight } from "./flight";

const tmp = {
  goal: new THREE.Vector3(),
  center: new THREE.Vector3(),
  desired: new THREE.Vector3(),
  forward: new THREE.Vector3(),
  camPos: new THREE.Vector3(),
  look: new THREE.Vector3(),
  lookNow: new THREE.Vector3(0, 2, 0),
  up: new THREE.Vector3(0, 1, 0),
};

/** Where we circle a target: centre + radius. */
function orbitFor(id: string | null): { c: THREE.Vector3; r: number; h: number } | null {
  if (!id) return null;
  if (id === "crest") return { c: tmp.center.set(...CREST_POS), r: CREST_HEIGHT * 0.95, h: 0.6 };
  const w = worldById(id);
  if (!w) return null;
  return { c: tmp.center.set(...worldPos(w)), r: w.radius * 3.4 + 0.8, h: 0.35 };
}

function wingShape(side: 1 | -1) {
  // a fingered raven wing, root at the origin, reaching out along ±x
  const s = new THREE.Shape();
  s.moveTo(0, 0.12);
  s.bezierCurveTo(side * 0.35, 0.2, side * 0.75, 0.16, side * 1.05, 0.02);
  s.lineTo(side * 0.98, -0.06);
  s.lineTo(side * 0.86, -0.02);
  s.lineTo(side * 0.8, -0.12);
  s.lineTo(side * 0.68, -0.08);
  s.lineTo(side * 0.6, -0.18);
  s.lineTo(side * 0.46, -0.14);
  s.bezierCurveTo(side * 0.3, -0.2, side * 0.12, -0.2, 0, -0.16);
  s.lineTo(0, 0.12);
  return new THREE.ShapeGeometry(s, 12);
}

/**
 * The player's raven plus its flight model and the follow camera. Picking a
 * world flies there and circles it; a flick on empty sky gives an impulse;
 * the camera trails behind and above.
 */
export function Raven() {
  const camera = useThree((s) => s.camera);
  const body = useRef<THREE.Group>(null);
  const left = useRef<THREE.Group>(null);
  const right = useRef<THREE.Group>(null);
  const flap = useRef(0);
  const lastHeading = useRef(flight.heading);
  const parkedId = useRef<string | null>(null);

  const geo = useMemo(() => ({ l: wingShape(-1), r: wingShape(1) }), []);
  const mats = useMemo(
    () => ({
      feather: new THREE.MeshStandardMaterial({
        color: "#14101c",
        roughness: 0.26,
        metalness: 0.55,
        emissive: "#2a1550",
        emissiveIntensity: 0.75,
        side: THREE.DoubleSide,
      }),
      beak: new THREE.MeshStandardMaterial({ color: "#5c4718", roughness: 0.4, metalness: 0.7 }),
      gold: new THREE.MeshBasicMaterial({ color: "#ffcf73", toneMapped: false }),
      violet: new THREE.MeshBasicMaterial({ color: "#c49bff", toneMapped: false }),
    }),
    [],
  );

  useFrame((state, dtRaw) => {
    const dt = Math.min(dtRaw, 1 / 20);
    const t = state.clock.elapsedTime;
    const orbit = orbitFor(flight.target);
    const maxSpeed = flight.calm ? 6 : 11;

    if (flight.mode === "travel") {
      if (orbit) {
        // approach the nearest point on the orbit circle
        const a = Math.atan2(flight.pos.z - orbit.c.z, flight.pos.x - orbit.c.x);
        tmp.goal.set(orbit.c.x + Math.cos(a) * orbit.r, orbit.c.y + orbit.h, orbit.c.z + Math.sin(a) * orbit.r);
        if (flight.pos.distanceTo(tmp.goal) < 0.7) {
          flight.mode = "orbit";
          flight.orbitAngle = a;
        }
      } else {
        tmp.goal.copy(START);
        if (flight.pos.distanceTo(START) < 0.5) {
          flight.mode = "free";
          flight.vel.multiplyScalar(0.2);
        }
      }
      tmp.desired.copy(tmp.goal).sub(flight.pos);
      const d = tmp.desired.length();
      tmp.desired.normalize().multiplyScalar(Math.min(maxSpeed, 1.2 + d * 1.6));
      flight.vel.lerp(tmp.desired, 1 - Math.exp(-3 * dt));
    } else if (flight.mode === "orbit" && orbit) {
      flight.orbitAngle += dt * (0.9 / orbit.r) * (flight.calm ? 0.5 : 1);
      tmp.goal.set(
        orbit.c.x + Math.cos(flight.orbitAngle) * orbit.r,
        orbit.c.y + orbit.h + Math.sin(t * 0.7) * 0.12,
        orbit.c.z + Math.sin(flight.orbitAngle) * orbit.r,
      );
      tmp.desired.copy(tmp.goal).sub(flight.pos).multiplyScalar(4);
      flight.vel.lerp(tmp.desired, 1 - Math.exp(-6 * dt));
    } else {
      // free flight: coast and slow down
      flight.vel.multiplyScalar(Math.exp(-0.7 * dt));
    }

    if (flight.vel.length() > maxSpeed) flight.vel.setLength(maxSpeed);
    flight.pos.addScaledVector(flight.vel, dt);
    // keep inside the sky
    if (flight.pos.length() > 24) flight.pos.setLength(24);
    flight.pos.y = THREE.MathUtils.clamp(flight.pos.y, -5, 10);

    // which world are we circling? (drives the HUD)
    const here = flight.mode === "orbit" ? flight.target : null;
    if (here !== parkedId.current) {
      parkedId.current = here;
      sceneStore.setActive(here && here !== "crest" ? here : null);
    }

    // orientation: face the velocity, bank into turns
    const speed = flight.vel.length();
    if (speed > 0.15) flight.heading = Math.atan2(flight.vel.x, flight.vel.z);
    let dh = flight.heading - lastHeading.current;
    dh = Math.atan2(Math.sin(dh), Math.cos(dh));
    lastHeading.current = flight.heading;
    flight.bank = THREE.MathUtils.damp(flight.bank, THREE.MathUtils.clamp(-dh / Math.max(dt, 1e-3) * 0.12, -0.7, 0.7), 4, dt);

    const b = body.current;
    if (b) {
      b.position.copy(flight.pos);
      b.rotation.set(THREE.MathUtils.clamp(-flight.vel.y * 0.06, -0.5, 0.5), flight.heading, flight.bank, "YXZ");
    }

    // wings: beat harder when climbing or accelerating, glide when cruising
    const effort = THREE.MathUtils.clamp(0.35 + flight.vel.y * 0.12 + (speed < 2 ? 0.4 : 0), 0.15, 1);
    flap.current += dt * (flight.calm ? 4 : 7 + effort * 5);
    const angle = Math.sin(flap.current) * (0.25 + effort * 0.55) + 0.1;
    if (left.current) left.current.rotation.z = angle;
    if (right.current) right.current.rotation.z = -angle;

    // follow camera: behind and above, looking a little ahead
    tmp.forward.set(Math.sin(flight.heading), 0, Math.cos(flight.heading));
    const dist = 5.2 * flight.zoom;
    if (flight.mode === "orbit" && orbit && flight.target !== "crest") {
      // stand on the far side of the world, away from the crest: the world
      // fills the foreground, the raven circles it, the crest stands behind
      tmp.camPos.set(orbit.c.x - CREST_POS[0], 0, orbit.c.z - CREST_POS[2]);
      if (tmp.camPos.lengthSq() < 1e-4) tmp.camPos.set(0, 0, 1);
      // swing ~35° toward the front so world and crest sit side by side, never stacked
      const side = Math.sign(orbit.c.x - CREST_POS[0]) || 1;
      tmp.camPos.normalize().applyAxisAngle(tmp.up, side * 0.62);
      tmp.camPos.multiplyScalar(orbit.r + dist * 1.1).add(orbit.c);
      tmp.camPos.y = orbit.c.y + 2.4 * flight.zoom;
      tmp.look.copy(orbit.c).lerp(flight.pos, 0.3);
    } else if (flight.mode === "orbit" && orbit) {
      // circling the crest: camera rides outside the raven, facing the art
      tmp.camPos.copy(flight.pos).sub(orbit.c).setY(0).normalize().multiplyScalar(dist * 1.6).add(flight.pos);
      tmp.camPos.y = flight.pos.y + 2.6 * flight.zoom;
      tmp.look.copy(orbit.c).lerp(flight.pos, 0.35);
    } else {
      tmp.camPos.copy(flight.pos).addScaledVector(tmp.forward, -dist);
      tmp.camPos.y += 2.5 * flight.zoom;
      tmp.look.copy(flight.pos).addScaledVector(tmp.forward, 3);
    }
    const k = 1 - Math.exp(-(flight.calm ? 2 : 3.2) * dt);
    camera.position.lerp(tmp.camPos, k);
    tmp.lookNow.lerp(tmp.look, k);
    camera.lookAt(tmp.lookNow);
  });

  return (
    <group ref={body} scale={0.85}>
      {/* body, head, beak, tail */}
      <mesh material={mats.feather} scale={[0.2, 0.18, 0.55]}>
        <sphereGeometry args={[1, 20, 14]} />
      </mesh>
      <mesh material={mats.feather} position={[0, 0.1, 0.5]}>
        <sphereGeometry args={[0.15, 16, 12]} />
      </mesh>
      <mesh material={mats.beak} position={[0, 0.07, 0.72]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.05, 0.24, 8]} />
      </mesh>
      {/* the crest's mismatched eyes */}
      <mesh material={mats.gold} position={[-0.1, 0.15, 0.58]}>
        <sphereGeometry args={[0.025, 8, 6]} />
      </mesh>
      <mesh material={mats.violet} position={[0.1, 0.15, 0.58]}>
        <sphereGeometry args={[0.025, 8, 6]} />
      </mesh>
      <mesh material={mats.feather} position={[0, 0.02, -0.62]} rotation={[-Math.PI / 2, 0, 0]} scale={[1, 1.4, 1]}>
        <coneGeometry args={[0.16, 0.36, 4, 1, true]} />
      </mesh>
      <group ref={left} position={[-0.14, 0.08, 0.08]} rotation={[0, 0, 0]}>
        <mesh geometry={geo.l} material={mats.feather} rotation={[Math.PI / 2, 0, 0]} />
      </group>
      <group ref={right} position={[0.14, 0.08, 0.08]}>
        <mesh geometry={geo.r} material={mats.feather} rotation={[Math.PI / 2, 0, 0]} />
      </group>
      <pointLight color="#9b5cff" intensity={3} distance={3.5} position={[0.6, 0.6, 0]} />
      <pointLight color="#ffc56a" intensity={2.4} distance={3.5} position={[-0.6, 0.6, 0]} />
    </group>
  );
}
