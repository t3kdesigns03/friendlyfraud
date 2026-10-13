// Where everything sits in the Sundering. Shared by the homepage scene and
// /explore so a world is in the same place in both.

export type V3 = [number, number, number];

/** The crest floats above the vortex core, which is also the scene's sun. */
export const CREST_POS: V3 = [0, 1.6, 0];
export const CREST_HEIGHT = 8.2;
/** the vortex sits under the shield's point so no particle ever crosses the art */
export const VORTEX_Y = -2.9;
export const SUN_POS: V3 = [0, -2.4, 0];
export const VORTEX_RADIUS = 6.4;

export type WorldLook = "magma" | "frost" | "barrow" | "river" | "sky";
export const LOOK_INDEX: Record<WorldLook, number> = { magma: 0, frost: 1, barrow: 2, river: 3, sky: 4 };

export type WorldSpot = {
  id: string;
  slug: string;
  kind: "raid" | "zone";
  name: string;
  tagline: string;
  /** atmosphere + label dot */
  color: string;
  /** emissive features: lava, tree light, runes */
  glow: string;
  position: V3;
  radius: number;
  look: WorldLook;
  ring?: { color: string; tilt: number };
  phase: number;
};

export const WORLDS: WorldSpot[] = [
  {
    id: "raid:onyxias-lair",
    slug: "onyxias-lair",
    kind: "raid",
    name: "Onyxia's Lair",
    tagline: "40-player raid · the original",
    color: "#ff8a4c",
    glow: "#ff5a1f",
    position: [-8.4, 3.4, -2.0],
    radius: 0.9,
    look: "magma",
    ring: { color: "#ff9a5c", tilt: 0.55 },
    phase: 0.4,
  },
  {
    id: "raid:hyjal-summit",
    slug: "hyjal-summit",
    kind: "raid",
    name: "Hyjal Summit",
    tagline: "20-player raid",
    color: "#a9dcff",
    glow: "#ffd36b",
    position: [8.4, 2.8, -2.6],
    radius: 1.0,
    look: "frost",
    phase: 2.1,
  },
  {
    id: "raid:barrow-deeps",
    slug: "barrow-deeps",
    kind: "raid",
    name: "Barrow Deeps",
    tagline: "10-player raid",
    color: "#8ff0cf",
    glow: "#6fe3c0",
    position: [7.5, -2.5, 2.4],
    radius: 0.74,
    look: "barrow",
    ring: { color: "#b993ff", tilt: -0.5 },
    phase: 3.7,
  },
  {
    id: "zone:riverglades",
    slug: "riverglades",
    kind: "zone",
    name: "Riverglades",
    tagline: "New zone in Forever",
    color: "#62d9ad",
    glow: "#9ff2ff",
    position: [-7.4, -2.7, 2.2],
    radius: 0.6,
    look: "river",
    phase: 5.0,
  },
  {
    id: "zone:zephras-isle",
    slug: "zephras-isle",
    kind: "zone",
    name: "Zephras Isle",
    tagline: "New zone in Forever",
    color: "#d9ccff",
    glow: "#ffffff",
    position: [-7.0, 5.0, -3.2],
    radius: 0.52,
    look: "sky",
    ring: { color: "#e6dcff", tilt: 0.25 },
    phase: 1.2,
  },
];

export const worldById = (id: string | null) => (id ? WORLDS.find((w) => w.id === id) ?? null : null);

/** Roster lights circle the crest on a tilted ring. */
export const MOTE_RING = { radius: 5.5, spread: 0.5, tilt: 0.9, speed: 0.07 };

/** Composition half-extents used to frame the whole scene in a stage rect. */
/** worlds sit outside the shield at every orbit scale, so nothing ever covers the crest */
export const COMPOSITION = { center: [0, 1.6, 0] as V3, halfWidth: 9.5, halfHeight: 5.6 };

/**
 * Small screens pull the world orbits in so the crest stays large enough to
 * read while every world still fits the band. Set once by SceneCanvas.
 */
export const orbit = { scale: 1 };
export const worldPos = (w: WorldSpot): V3 => [w.position[0] * orbit.scale, w.position[1], w.position[2] * orbit.scale];
export const compositionHalf = () => ({
  // never narrower than the crest artwork itself
  w: Math.max(COMPOSITION.halfWidth * orbit.scale, (CREST_HEIGHT / 0.88) * 0.56),
  h: Math.max(COMPOSITION.halfHeight * (0.45 + 0.55 * orbit.scale), CREST_HEIGHT * 0.58),
});
