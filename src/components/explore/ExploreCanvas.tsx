"use client";

import { useThree } from "@react-three/fiber";
import { useEffect } from "react";
import * as THREE from "three";
import SceneCanvas from "../scene/SceneCanvas";
import { flick, flight, flyTo } from "./flight";
import { Raven } from "./Raven";
import { sceneStore } from "@/lib/scene/store";

/**
 * Gestures on the canvas: a flick on empty sky is an impulse, wheel/pinch
 * zooms the follow camera. Taps on worlds are handled by the worlds' own
 * hit volumes (and ignored if the gesture was a drag).
 */
function Gestures() {
  const gl = useThree((s) => s.gl);
  const camera = useThree((s) => s.camera);
  useEffect(() => {
    const el = gl.domElement;
    const pts = new Map<number, { x: number; y: number }>();
    let start: { x: number; y: number; t: number } | null = null;
    let pinch = 0;
    const fwd = new THREE.Vector3();
    const right = new THREE.Vector3();

    const down = (e: PointerEvent) => {
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pts.size === 1) {
        start = { x: e.clientX, y: e.clientY, t: performance.now() };
        flight.dragged = false;
      } else if (pts.size === 2) {
        const [a, b] = [...pts.values()];
        pinch = Math.hypot(a.x - b.x, a.y - b.y);
      }
    };
    const move = (e: PointerEvent) => {
      if (!pts.has(e.pointerId)) return;
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pts.size === 2) {
        const [a, b] = [...pts.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinch) flight.zoom = THREE.MathUtils.clamp(flight.zoom * (pinch / d), 0.55, 2.2);
        pinch = d;
        flight.dragged = true;
      } else if (start && Math.hypot(e.clientX - start.x, e.clientY - start.y) > 10) {
        flight.dragged = true;
      }
    };
    const up = (e: PointerEvent) => {
      if (start && pts.size === 1 && flight.dragged) {
        const dt = Math.max(60, performance.now() - start.t);
        const dx = ((e.clientX - start.x) / dt) * 180;
        const dy = ((e.clientY - start.y) / dt) * 180;
        camera.getWorldDirection(fwd);
        right.crossVectors(fwd, camera.up).normalize();
        if (!flight.calm) flick(dx, dy, fwd, right);
        sceneStore.setInteracted();
      }
      pts.delete(e.pointerId);
      if (pts.size < 2) pinch = 0;
      if (!pts.size) start = null;
    };
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      flight.zoom = THREE.MathUtils.clamp(flight.zoom * Math.exp(e.deltaY * 0.0012), 0.55, 2.2);
    };
    el.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    el.addEventListener("wheel", wheel, { passive: false });
    return () => {
      el.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      el.removeEventListener("wheel", wheel);
    };
  }, [gl, camera]);
  return null;
}

export default function ExploreCanvas({ onReady, calm }: { onReady: () => void; calm: boolean }) {
  useEffect(() => {
    flight.calm = calm;
  }, [calm]);
  const pick = (id: string) => {
    if (flight.dragged) return;
    sceneStore.setInteracted();
    flyTo(id);
  };
  return (
    <SceneCanvas
      fov={55}
      keepOrbits
      onReady={onReady}
      onPickWorld={pick}
      onOpenCharacter={(_path, id) => {
        if (flight.dragged) return;
        sceneStore.setInteracted();
        sceneStore.setPicked(id);
        flyTo("crest");
      }}
    >
      <Raven />
      <Gestures />
    </SceneCanvas>
  );
}
