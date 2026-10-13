"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { GALAXY } from "@/config/worlds";
import { CREST_POS } from "@/lib/scene/layout";
import { GALAXY_CENTER, bodyOf, orbitRadius, overviewBodies, parkDirection } from "./layout";
import { Gryphon } from "./Gryphon";
import { HOME, flight, g, galaxy, markerEls } from "./store";


export function bezier(t: number, out: THREE.Vector3) {
  const u = 1 - t;
  return out
    .copy(flight.p0)
    .multiplyScalar(u * u * u)
    .addScaledVector(flight.p1, 3 * u * u * t)
    .addScaledVector(flight.p2, 3 * u * t * t)
    .addScaledVector(flight.p3, t * t * t);
}

const TRAIL = 80;

/**
 * Flight easing: a gentle lift-off and a long, soft ease-out arrival —
 * smoothstep in time, then an ease-out on top of it.
 */
export const easeFlight = (t: number) => {
  const s = t * t * (3 - 2 * t);
  return 1 - Math.pow(1 - s, 2.2);
};

/**
 * The mount and its flight model. Every trip is a cubic Bézier that leaves
 * along the current heading, sweeps wide to one side (alternating, with a
 * varied swing and climb), and arrives already gliding along the target's
 * orbit — then the orbit speed ramps up, so there is no stop-and-turn.
 */
export function MountFlight({ small, calm }: { small: boolean; calm: boolean }) {
  const body = useRef<THREE.Group>(null);
  const trail = useRef<THREE.Points>(null);
  const bank = useRef(0);
  const lastDir = useRef(new THREE.Vector3(0, 0, -1));
  const arrivedAt = useRef(0);
  const tmp = useMemo(
    () => ({ a: new THREE.Vector3(), b: new THREE.Vector3(), c: new THREE.Vector3(), tan: new THREE.Vector3(), up: new THREE.Vector3(0, 1, 0) }),
    [],
  );

  // soft round spark for the trail (points are square without a map)
  const spark = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const x = c.getContext("2d")!;
    const grd = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    grd.addColorStop(0, "rgba(255,255,255,1)");
    grd.addColorStop(0.4, "rgba(255,255,255,0.35)");
    grd.addColorStop(1, "rgba(255,255,255,0)");
    x.fillStyle = grd;
    x.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  }, []);
  const trailGeo = useMemo(() => {
    const geom = new THREE.BufferGeometry();
    const pos = new Float32Array(TRAIL * 3);
    for (let i = 0; i < TRAIL; i++) pos.set([HOME.x, HOME.y, HOME.z], i * 3);
    geom.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const col = new Float32Array(TRAIL * 3);
    for (let i = 0; i < TRAIL; i++) {
      const f = Math.pow(1 - i / TRAIL, 1.4);
      const violet = i % 3 !== 0;
      col.set(violet ? [0.62 * f, 0.36 * f, 1.0 * f] : [1.0 * f, 0.75 * f, 0.35 * f], i * 3);
    }
    geom.setAttribute("color", new THREE.BufferAttribute(col, 3));
    return geom;
  }, []);

  useFrame((state, dtRaw) => {
    const dt = Math.min(dtRaw, 1 / 15);
    const t = state.clock.elapsedTime;

    // —— plan a new trip ————————————————————————————————————————————————
    if (flight.pending) {
      flight.pending = false;
      flight.trips++;
      const id = g.target;
      flight.p0.copy(flight.pos);
      const sign = flight.trips % 2 ? 1 : -1;
      const swing = 0.75 + ((flight.trips * 0.61) % 1) * 0.5;
      const climb = ((flight.trips * 0.37) % 1) - 0.35;
      if (id) {
        const b = bodyOf(id)!;
        parkDirection(id, tmp.a);
        flight.p3.copy(b.c).addScaledVector(tmp.a, orbitRadius(id)).add(tmp.b.set(0, 0.6, 0));
        flight.orbitAngle = Math.atan2(flight.p3.z - b.c.z, flight.p3.x - b.c.x);
        // orbit direction at the entry point (angle increases → counter-clockwise)
        tmp.tan.set(-Math.sin(flight.orbitAngle), 0, Math.cos(flight.orbitAngle));
      } else {
        flight.p3.copy(HOME);
      }
      const span = tmp.c.copy(flight.p3).sub(flight.p0);
      const dist = Math.max(0.001, span.length());
      const dir = span.clone().normalize();
      const side = tmp.b.crossVectors(dir, tmp.up).normalize();
      const sweep = dist * (small ? 0.3 : 0.45) * swing * sign;
      const lift = dist * (small ? 0.12 : 0.22) * climb;
      // leave along the current heading, bowed out to one side and up/down
      flight.p1
        .copy(flight.p0)
        .addScaledVector(flight.dir, dist * 0.18)
        .addScaledVector(dir, dist * 0.14)
        .addScaledVector(side, sweep)
        .add(tmp.a.set(0, lift + dist * 0.08, 0));
      // arrive gliding along the orbit (or swing into the idle spot when going home)
      if (id) flight.p2.copy(flight.p3).addScaledVector(tmp.tan, -dist * 0.32).add(tmp.a.set(0, lift * 0.3, 0));
      else flight.p2.copy(flight.p3).addScaledVector(dir, -dist * 0.3).addScaledVector(side, sweep * 0.35);
      const speed = small ? 16 : 12;
      flight.duration = calm ? 1.2 : THREE.MathUtils.clamp(dist / speed, small ? 1.6 : 2.4, small ? 3.0 : 4.6);
      flight.t = 0;
      flight.startedAt = t;
    }

    // —— move ——————————————————————————————————————————————————————————
    const prev = tmp.a.copy(flight.pos);
    if (flight.t < 1) {
      flight.t = Math.min(1, (t - flight.startedAt) / flight.duration);
      bezier(easeFlight(flight.t), flight.pos);
      if (flight.t >= 1) {
        arrivedAt.current = t;
        galaxy.set("phase", g.target ? "arrived" : "overview");
      }
    } else if (g.target) {
      // settle into the orbit: speed ramps from zero so the arrival never snaps
      const b = bodyOf(g.target)!;
      const r = orbitRadius(g.target);
      const ramp = THREE.MathUtils.smoothstep(t - arrivedAt.current, 0, 2.2);
      flight.orbitAngle += dt * (0.5 / Math.max(1.5, r)) * 2.2 * ramp;
      flight.pos.set(
        b.c.x + Math.cos(flight.orbitAngle) * r,
        b.c.y + 0.6 + Math.sin(t * 0.8) * 0.15 * ramp,
        b.c.z + Math.sin(flight.orbitAngle) * r,
      );
    } else {
      // idle near home: a lazy figure-eight in front of the star, eased in
      const ramp = THREE.MathUtils.smoothstep(t - arrivedAt.current, 0, 2.5);
      const tt = (t - arrivedAt.current) * ramp;
      flight.pos.set(
        HOME.x + Math.sin(tt * 0.25) * 2.2 * ramp,
        HOME.y + Math.sin(tt * 0.5) * 0.5 * ramp,
        HOME.z + Math.sin(tt * 0.25) * Math.cos(tt * 0.25) * 1.4 * ramp,
      );
    }
    const vel = tmp.b.copy(flight.pos).sub(prev);
    if (vel.lengthSq() > 1e-8) flight.dir.lerp(vel.normalize(), 0.35).normalize();

    // —— orient: face the travel, pitch with the climb, bank into turns ————————
    const yawNow = Math.atan2(flight.dir.x, flight.dir.z);
    const yawPrev = Math.atan2(lastDir.current.x, lastDir.current.z);
    let dy = yawNow - yawPrev;
    dy = Math.atan2(Math.sin(dy), Math.cos(dy));
    lastDir.current.copy(flight.dir);
    bank.current = THREE.MathUtils.damp(bank.current, THREE.MathUtils.clamp((-dy / Math.max(dt, 1e-3)) * 0.3, -0.85, 0.85), 3.5, dt);
    if (body.current) {
      body.current.position.copy(flight.pos);
      body.current.rotation.set(-Math.asin(THREE.MathUtils.clamp(flight.dir.y, -0.8, 0.8)) * 0.8, yawNow, bank.current, "YXZ");
    }

    // —— trail ——————————————————————————————————————————————————————————
    const flying = flight.t < 1;
    const p = trailGeo.attributes.position as THREE.BufferAttribute;
    const arr = p.array as Float32Array;
    arr.copyWithin(3, 0, (TRAIL - 1) * 3);
    arr[0] = flight.pos.x - flight.dir.x * 2.1;
    arr[1] = flight.pos.y - flight.dir.y * 2.1 + 0.25;
    arr[2] = flight.pos.z - flight.dir.z * 2.1;
    p.needsUpdate = true;
    if (trail.current) (trail.current.material as THREE.PointsMaterial).opacity = flying ? 0.95 : 0.4;
  });

  return (
    <>
      <points ref={trail} geometry={trailGeo} frustumCulled={false}>
        <pointsMaterial size={0.3} map={spark} alphaTest={0.01} vertexColors transparent opacity={0.6} depthWrite={false} blending={THREE.AdditiveBlending} sizeAttenuation toneMapped={false} />
      </points>
      <group ref={body} scale={0.95}>
        <Gryphon />
        <pointLight color="#9b5cff" intensity={5} distance={5} position={[1.2, 1.2, 0]} />
        <pointLight color="#ffc56a" intensity={4} distance={5} position={[-1.2, 1.2, 0.4]} />
      </group>
    </>
  );
}

/** The part of the screen not covered by HUD or panel, where the camera frames its subject. */
export function visibleRect(W: number, H: number, small: boolean, panel: boolean) {
  const top = small ? 64 : 76;
  const bottom = small ? 76 : 88;
  if (panel && small) return { x: 0, y: top, w: W, h: Math.max(160, H * 0.44 - top) };
  if (panel) return { x: 0, y: top, w: Math.max(320, W - 440), h: H - top - bottom };
  return { x: 0, y: top, w: W, h: H - top - bottom };
}

/**
 * Cinematic camera: overview fits every world into the free screen area;
 * in flight it chases the mount, looking ahead along the curve; on arrival
 * it parks so the world, the mount and the star behind all read — framed
 * clear of the panel.
 */
export function GalaxyRig({ small, calm }: { small: boolean; calm: boolean }) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const size = useThree((s) => s.size);
  const pos = useRef(new THREE.Vector3(0, 12, 60));
  const look = useRef(GALAXY_CENTER.clone());
  const off = useRef({ x: 0, y: 0, init: false });
  const tmp = useMemo(
    () => ({
      dir: new THREE.Vector3(),
      right: new THREE.Vector3(),
      up: new THREE.Vector3(),
      rel: new THREE.Vector3(),
      want: new THREE.Vector3(),
      at: new THREE.Vector3(),
      worldUp: new THREE.Vector3(0, 1, 0),
    }),
    [],
  );

  useEffect(() => () => camera.clearViewOffset(), [camera]);
  const bodies = useMemo(() => overviewBodies(), []);

  useFrame((state, dtRaw) => {
    const dt = Math.min(dtRaw, 1 / 15);
    const t = state.clock.elapsedTime;
    const W = size.width;
    const H = size.height;
    const panel = g.phase === "arrived";
    const rect = visibleRect(W, H, small, panel);
    const tanV = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const px = small || calm ? 0 : state.pointer.x;
    const py = small || calm ? 0 : state.pointer.y;

    if (g.phase === "flying" || (g.phase === "overview" && flight.t < 1)) {
      // chase: behind and above the mount, looking where it's going
      const d = (small ? 8 : 10) * flight.zoom;
      tmp.want.copy(flight.pos).addScaledVector(flight.dir, -d).add(tmp.rel.set(0, d * 0.38, 0));
      // look ahead along the curve, not just down the nose
      if (flight.t < 1) bezier(easeFlight(Math.min(1, flight.t + 0.14)), tmp.at);
      else tmp.at.copy(flight.pos).addScaledVector(flight.dir, 5);
    } else if (g.phase === "arrived" && g.target) {
      const b = bodyOf(g.target)!;
      parkDirection(g.target, tmp.dir);
      const r = orbitRadius(g.target) * 1.25;
      const half = Math.min((tanV * rect.w) / H, (tanV * rect.h) / H);
      // stand well outside the mount's orbit so it never fills the lens
      const d = Math.max(r / half, orbitRadius(g.target) * 3.4) * flight.zoom;
      tmp.dir.applyAxisAngle(tmp.worldUp, Math.sin(t * 0.06) * 0.08 + px * 0.1);
      tmp.want.copy(b.c).addScaledVector(tmp.dir, d).add(tmp.rel.set(0, d * (0.22 + py * 0.05), 0));
      tmp.at.copy(b.c);
    } else {
      // overview: fit every body into the free area
      const az = 0.18 + Math.sin(t * 0.03) * 0.06 + px * 0.06;
      // portrait screens look further down so the disk fills the height
      const el = (small ? 1.02 : 0.5) + py * 0.04;
      tmp.dir.set(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el));
      tmp.right.crossVectors(tmp.worldUp, tmp.dir).normalize();
      tmp.up.crossVectors(tmp.dir, tmp.right).normalize();
      let hw = 0;
      let hh = 0;
      for (const o of bodies) {
        tmp.rel.copy(o.c).sub(GALAXY_CENTER);
        hw = Math.max(hw, Math.abs(tmp.rel.dot(tmp.right)) + o.r);
        hh = Math.max(hh, Math.abs(tmp.rel.dot(tmp.up)) + o.r);
      }
      const tanAh = (tanV * rect.w) / H;
      const tanAv = (tanV * rect.h) / H;
      const d = Math.max(hw / tanAh, hh / tanAv) * 1.16 * flight.zoom;
      tmp.want.copy(GALAXY_CENTER).addScaledVector(tmp.dir, d);
      tmp.at.copy(GALAXY_CENTER);
    }

    const k = calm ? 1 : 1 - Math.exp(-(g.phase === "flying" ? 3.2 : g.phase === "arrived" ? 2.6 : 1.8) * dt);
    if (!off.current.init) {
      pos.current.copy(tmp.want);
      look.current.copy(tmp.at);
    } else {
      pos.current.lerp(tmp.want, k);
      look.current.lerp(tmp.at, k);
    }
    camera.position.copy(pos.current);
    camera.lookAt(look.current);

    // projection centre follows the free area (chase uses the whole screen)
    const chase = g.phase === "flying";
    const cx = chase ? W / 2 : rect.x + rect.w / 2;
    const cy = chase ? H / 2 : rect.y + rect.h / 2;
    const ox = W / 2 - cx;
    const oy = H / 2 - cy;
    if (!off.current.init) off.current = { x: ox, y: oy, init: true };
    else {
      off.current.x += (ox - off.current.x) * k;
      off.current.y += (oy - off.current.y) * k;
    }
    camera.setViewOffset(W, H, off.current.x, off.current.y, W, H);
    camera.updateProjectionMatrix();
  });

  return null;
}

/**
 * Positions the DOM tap targets over each world every frame: at least 44px,
 * larger when the world is big on screen; hidden behind the camera.
 */
export function MarkerTracker() {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const tmp = useMemo(() => ({ c: new THREE.Vector3(), e: new THREE.Vector3(), r: new THREE.Vector3() }), []);
  const ids = useMemo(() => ["crest", ...GALAXY.map((w) => w.id)], []);
  useFrame(() => {
    tmp.r.setFromMatrixColumn(camera.matrixWorld, 0); // camera right
    for (const id of ids) {
      const el = markerEls.get(id);
      if (!el) continue;
      const b = bodyOf(id)!;
      tmp.c.copy(b.c);
      if (id === "crest") tmp.c.set(CREST_POS[0], CREST_POS[1], CREST_POS[2]);
      tmp.e.copy(tmp.c).addScaledVector(tmp.r, b.r);
      tmp.c.project(camera);
      tmp.e.project(camera);
      const visible = tmp.c.z < 1 && Math.abs(tmp.c.x) < 1.15 && Math.abs(tmp.c.y) < 1.15;
      const x = (tmp.c.x * 0.5 + 0.5) * size.width;
      const y = (-tmp.c.y * 0.5 + 0.5) * size.height;
      const ex = (tmp.e.x * 0.5 + 0.5) * size.width;
      const rPx = Math.abs(ex - x);
      const d = Math.round(Math.min(260, Math.max(48, rPx * 2.4)));
      el.style.transform = `translate3d(${(x - d / 2).toFixed(1)}px, ${(y - d / 2).toFixed(1)}px, 0)`;
      el.style.width = el.style.height = `${d}px`;
      el.style.visibility = visible ? "visible" : "hidden";
    }
  });
  return null;
}
