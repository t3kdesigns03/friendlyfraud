"use client";

import { useSyncExternalStore } from "react";
import type { SceneData } from "./types";

/**
 * Tiny external store shared by the 3D layer and the DOM. The canvas reads
 * `raw` inside useFrame (no React work); the UI subscribes with useScene.
 *
 * Ids: "raid:<slug>", "zone:<slug>", "char:<uuid>", "crest".
 */
export type SceneState = {
  /** thing under the pointer: a world in the sky, or a row/card that maps to one */
  hovered: string | null;
  /** world open in the slide-over panel */
  active: string | null;
  data: SceneData;
  webglFailed: boolean;
  /** the 3D scene has drawn its first frames (the static crest can fade out) */
  ready: boolean;
  /** /explore: the visitor has touched the sky (hide the hint) */
  interacted: boolean;
  /** /explore: roster light picked for the info card */
  picked: string | null;
};

const state: SceneState = {
  hovered: null,
  active: null,
  data: { raids: [], characters: [] },
  webglFailed: false,
  ready: false,
  interacted: false,
  picked: null,
};

let snapshot: SceneState = { ...state };
const listeners = new Set<() => void>();

function commit() {
  snapshot = { ...state };
  for (const l of listeners) l();
}

/** Mutable read — safe inside useFrame. */
export const raw = state;

/**
 * Live positions of moving things (orbiting character motes), written by the
 * scene each frame so the camera and hover label can follow them.
 */
export const livePositions = new Map<string, [number, number, number]>();

export const sceneStore = {
  setHovered(id: string | null) {
    if (state.hovered === id) return;
    state.hovered = id;
    commit();
  },
  setActive(id: string | null) {
    if (state.active === id) return;
    state.active = id;
    commit();
  },
  setData(data: SceneData) {
    state.data = data;
    commit();
  },
  setReady(ready: boolean) {
    if (state.ready === ready) return;
    state.ready = ready;
    commit();
  },
  setInteracted() {
    if (state.interacted) return;
    state.interacted = true;
    commit();
  },
  setPicked(id: string | null) {
    if (state.picked === id) return;
    state.picked = id;
    commit();
  },
  failWebgl() {
    state.webglFailed = true;
    commit();
  },
};

export function useScene<T>(select: (s: SceneState) => T): T {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => select(snapshot),
    () => select(state),
  );
}

/** Props that make any DOM row light up its world in the sky. */
export function hoverProps(id: string) {
  return {
    onMouseEnter: () => sceneStore.setHovered(id),
    onMouseLeave: () => sceneStore.setHovered(null),
    onFocus: () => sceneStore.setHovered(id),
    onBlur: () => sceneStore.setHovered(null),
  };
}
