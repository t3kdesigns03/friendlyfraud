import * as THREE from "three";
import { GALAXY, galaxyWorld, type GalaxyWorld } from "@/config/worlds";
import { CREST_HEIGHT, CREST_POS } from "@/lib/scene/layout";

export const CREST_STAR_RADIUS = CREST_HEIGHT * 0.62;

/**
 * Phones pull every orbit in so the whole galaxy fills a portrait screen
 * at a readable size. Set once by GalaxyCanvas before the first frame.
 */
export const galaxyScale = { x: 1, y: 1, z: 1 };

export const worldPosition = (w: GalaxyWorld, out = new THREE.Vector3()) =>
  out.set(w.position[0] * galaxyScale.x, w.position[1] * galaxyScale.y, w.position[2] * galaxyScale.z);

/** Centre + radius of anything you can fly to. */
export function bodyOf(id: string): { c: THREE.Vector3; r: number } | null {
  if (id === "crest") return { c: new THREE.Vector3(...CREST_POS), r: CREST_STAR_RADIUS };
  const w = galaxyWorld(id);
  return w ? { c: worldPosition(w), r: w.radius } : null;
}

/** Where the raven circles a body. */
export function orbitRadius(id: string) {
  if (id === "crest") return CREST_HEIGHT * 0.95;
  const w = galaxyWorld(id);
  return w ? w.radius * 2.7 + 1.0 : 3;
}

/**
 * The side of a body the camera parks on: away from the Crest Star (so the
 * star stands behind the world), swung toward the default view direction.
 */
export function parkDirection(id: string, out: THREE.Vector3) {
  if (id === "crest") return out.set(0.15, 0, 1).normalize();
  const b = bodyOf(id)!;
  out.set(b.c.x - CREST_POS[0], 0, b.c.z - CREST_POS[2]);
  if (out.lengthSq() < 1e-4) out.set(0, 0, 1);
  out.normalize();
  // blend toward the viewer's side of the galaxy so we never park "behind" it
  out.lerp(new THREE.Vector3(0, 0, 1), 0.45).normalize();
  return out;
}

/** Everything that should fit in the overview frame (recomputed: the scale can change). */
export function overviewBodies() {
  return [
    { c: new THREE.Vector3(...CREST_POS), r: CREST_STAR_RADIUS * 1.1 },
    ...GALAXY.map((w) => ({ c: worldPosition(w), r: w.radius * (w.ring ? 2.3 : w.kind === "uncharted" ? 2.6 : 1.5) })),
  ];
}
export const GALAXY_CENTER = new THREE.Vector3(0, 0.8, 0);
