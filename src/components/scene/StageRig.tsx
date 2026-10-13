"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { COMPOSITION, CREST_POS, compositionHalf, worldById, worldPos } from "@/lib/scene/layout";
import { livePositions, raw } from "@/lib/scene/store";
import { stageHost } from "./labelHost";

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const ease = (p: number) => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2);

/**
 * Homepage camera. Instead of a fixed pose, the whole composition is
 * *fitted* into a DOM rect (the hero "stage"): distance is solved so every
 * world is inside it, and a view offset moves the projection centre onto
 * it. On a phone the stage is a band under the buttons, so the scene can
 * never ride up under the copy or clip at the edges — at any width.
 *
 * Scrolling past the hero lerps the stage out to the full viewport and
 * dollies in: you fall into the sky. The pointer adds parallax (desktop);
 * hovering a world or roster light leans toward it.
 */
export function StageRig({ frozen, small }: { frozen: boolean; small: boolean }) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const size = useThree((s) => s.size);

  const center = useMemo(() => new THREE.Vector3(...COMPOSITION.center), []);
  const look = useRef(new THREE.Vector3(...COMPOSITION.center));
  const pos = useRef(new THREE.Vector3(0, 4, 24));
  const off = useRef({ x: 0, y: 0, ready: false });
  const pull = useRef(0);
  const tmp = useMemo(() => ({ target: new THREE.Vector3(), spot: new THREE.Vector3(), dir: new THREE.Vector3() }), []);

  useEffect(() => () => camera.clearViewOffset(), [camera]);

  useFrame((state, dt) => {
    const d = Math.min(dt, 1 / 20);
    const W = size.width;
    const H = size.height;
    const scroll = window.scrollY;

    // stage rect in viewport space (it scrolls with the page)
    let sx = 0;
    let sy = 0;
    let sw = W;
    let sh = H;
    const el = stageHost.el;
    if (el) {
      const r = el.getBoundingClientRect();
      sx = r.left;
      sy = r.top;
      sw = r.width;
      sh = r.height;
    }
    // 0 at the top, 1 once the hero is scrolled away
    const p = ease(clamp01(scroll / (H * 0.85)));
    const rx = sx + (0 - sx) * p;
    const ry = sy + (0 - sy) * p;
    const rw = sw + (W - sw) * p;
    const rh = sh + (H - sh) * p;

    // solve the distance that fits the composition inside the *stage*; past
    // the hero we keep that scale (never closer) and only recentre
    const tanV = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const half = compositionHalf();
    let dist = Math.max(half.w / ((tanV * sw) / H), half.h / ((tanV * sh) / H)) * 1.06;
    // past the hero the sky becomes the backdrop: rise over the vortex and
    // pull back a touch so the whole system sits behind the panels
    dist *= 1 - p * 0.08;

    // whole-page progress turns the camera slowly round the vortex
    const max = document.documentElement.scrollHeight - H;
    const whole = max > 0 ? clamp01(scroll / max) : 0;
    let az = 0.16 - whole * 0.6;
    let el2 = 0.36 + p * 0.42;
    if (!small && !frozen) {
      az += state.pointer.x * 0.07;
      el2 += state.pointer.y * 0.035;
    }

    // lean toward the hovered thing
    const id = raw.active ?? raw.hovered;
    const w = worldById(id);
    const live = id ? livePositions.get(id) : undefined;
    const has = !!(w || live || id === "crest");
    pull.current = THREE.MathUtils.damp(pull.current, has ? (raw.active ? 1 : 0.55) : 0, 3.2, d);
    tmp.target.copy(center);
    if (has && pull.current > 0.001) {
      if (w) tmp.spot.set(...worldPos(w));
      else if (live) tmp.spot.set(...live);
      else tmp.spot.set(...CREST_POS);
      tmp.target.lerp(tmp.spot, 0.32 * pull.current);
      dist *= 1 - 0.14 * pull.current;
    }

    tmp.dir.set(Math.sin(az) * Math.cos(el2), Math.sin(el2), Math.cos(az) * Math.cos(el2));
    const want = tmp.dir.multiplyScalar(dist).add(tmp.target);

    const k = frozen ? 1 : 1 - Math.exp(-2.8 * d);
    if (!off.current.ready) {
      pos.current.copy(want);
      look.current.copy(tmp.target);
    } else {
      pos.current.lerp(want, k);
      look.current.lerp(tmp.target, k);
    }
    camera.position.copy(pos.current);
    camera.lookAt(look.current);

    // put the projection centre on the rect centre
    const cx = rx + rw / 2;
    const cy = ry + rh / 2;
    const ox = W / 2 - cx;
    const oy = H / 2 - cy;
    if (!off.current.ready) {
      off.current = { x: ox, y: oy, ready: true };
    } else {
      // vertical follows scroll exactly (no lag against the page); x eases
      off.current.x += (ox - off.current.x) * k;
      off.current.y = oy;
    }
    camera.setViewOffset(W, H, off.current.x, off.current.y, W, H);
    camera.updateProjectionMatrix();
  });

  return null;
}
