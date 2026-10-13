"use client";

import { useSyncExternalStore } from "react";
import * as THREE from "three";

/**
 * Galaxy state. React subscribes for the HUD/panel; the 3D scene reads the
 * mutable `g` object every frame. `flight` holds the raven's live motion.
 */
export type Phase = "overview" | "flying" | "arrived";

type State = {
  /** under the mouse / keyboard focus */
  hovered: string | null;
  /** touch: first tap arms (label shows), second tap on the same world flies */
  armed: string | null;
  /** world being flown to / circled ("crest" for the Crest Star), null = home */
  target: string | null;
  phase: Phase;
  ready: boolean;
  interacted: boolean;
};

const state: State = { hovered: null, armed: null, target: null, phase: "overview", ready: false, interacted: false };
let snap: State = { ...state };
const listeners = new Set<() => void>();
const commit = () => {
  snap = { ...state };
  for (const l of listeners) l();
};

/** Mutable read for useFrame. */
export const g = state;

export const HOME = new THREE.Vector3(0, -1.2, 13);

export const flight = {
  pos: HOME.clone(),
  /** unit tangent of travel */
  dir: new THREE.Vector3(0, 0, -1),
  /** cubic Bézier for the current trip */
  p0: new THREE.Vector3(),
  p1: new THREE.Vector3(),
  p2: new THREE.Vector3(),
  p3: new THREE.Vector3(),
  t: 1,
  duration: 1,
  /** clock time the current trip started (progress is wall-clock, not frame-count) */
  startedAt: 0,
  /** a new trip was requested; the scene builds the path on its next frame */
  pending: false,
  orbitAngle: 0,
  zoom: 1,
  /** trips flown so far — varies the arc so no two flights look alike */
  trips: 0,
};

export const galaxy = {
  set<K extends keyof State>(key: K, value: State[K]) {
    if (state[key] === value) return;
    state[key] = value;
    commit();
  },
  flyTo(id: string | null) {
    state.target = id;
    state.armed = null;
    state.phase = "flying";
    state.interacted = true;
    flight.pending = true;
    commit();
  },
};

export function useGalaxy<T>(pick: (s: State) => T): T {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => pick(snap),
    () => pick(state),
  );
}

/** DOM marker elements, positioned by the scene each frame. */
export const markerEls = new Map<string, HTMLElement>();
