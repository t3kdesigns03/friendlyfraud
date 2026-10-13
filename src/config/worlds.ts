// ---------------------------------------------------------------------------
// The /explore galaxy: one entry per world. Adding a world is one entry here.
//
//   kind "guild"     — live guild data (raid worlds link by raidId; the Crest
//                      Star is special-cased by id "crest").
//   kind "lore"      — static atmosphere: zones, places, flavour.
//   kind "uncharted" — locked anomalies at the galaxy's edge. To promote one,
//                      change its kind (and give it a look / raidId / lore).
//
// Positions are in galaxy units around the Crest Star at the origin.
// Original art only — nothing here references Blizzard assets.
// ---------------------------------------------------------------------------

export type WorldKind = "guild" | "lore" | "uncharted";

/** Procedural surface looks (see GALAXY_LOOKS in src/components/galaxy/GalaxyWorld.tsx). */
export type WorldLook = "magma" | "frost" | "barrow" | "ember" | "mist" | "gale" | "anomaly";

export type GalaxyWorld = {
  id: string;
  kind: WorldKind;
  name: string;
  /** one line under the name */
  subtitle: string;
  /** atmosphere / label dot colour */
  color: string;
  /** emissive features: lava, tree light, runes, wind */
  glow: string;
  position: [number, number, number];
  radius: number;
  look: WorldLook;
  ring?: { color: string; tilt: number };
  /** guild worlds: the raid this world shows live data for */
  raidId?: string;
  /** lore worlds */
  lore?: { atmosphere: string; beats: string[]; coming: string };
  /** uncharted worlds */
  tease?: { line: string; hint: string };
};

export const CREST_STAR = {
  id: "crest",
  name: "The Crest Star",
  subtitle: "Home of Friendly Fraud",
  color: "#f0c56a",
};

export const GALAXY: GalaxyWorld[] = [
  // —— guild worlds (live data) ——————————————————————————————————————————
  {
    id: "onyxias-lair",
    kind: "guild",
    name: "Onyxia's Lair",
    subtitle: "40-player raid",
    color: "#ff8a4c",
    glow: "#ff5a1f",
    position: [-15, 2.5, -6],
    radius: 1.45,
    look: "magma",
    ring: { color: "#ff9a5c", tilt: 0.5 },
    raidId: "onyxias-lair",
  },
  {
    id: "hyjal-summit",
    kind: "guild",
    name: "Hyjal Summit",
    subtitle: "20-player raid",
    color: "#a9dcff",
    glow: "#ffd36b",
    position: [14, 3.5, -9],
    radius: 1.6,
    look: "frost",
    raidId: "hyjal-summit",
  },
  {
    id: "barrow-deeps",
    kind: "guild",
    name: "Barrow Deeps",
    subtitle: "10-player raid",
    color: "#8ff0cf",
    glow: "#6fe3c0",
    position: [11, -2.5, 10],
    radius: 1.25,
    look: "barrow",
    ring: { color: "#b993ff", tilt: -0.45 },
    raidId: "barrow-deeps",
  },

  // —— lore worlds (static atmosphere) ——————————————————————————————————
  {
    id: "mount-hyjal",
    kind: "lore",
    name: "Mount Hyjal",
    subtitle: "New zone",
    color: "#ffb35c",
    glow: "#ffcf73",
    position: [21, 7, 1],
    radius: 1.5,
    look: "ember",
    lore: {
      atmosphere: "A mountain that remembers fire. Ash on the old roots, and a canopy that still glows at night like a coal someone forgot to put out.",
      beats: ["Ember-scarred slopes under a world tree's light", "Where the road to Hyjal Summit begins", "Snow up high, smoke down low"],
      coming: "Part of WoW: Forever's new zones at launch (Nov 4).",
    },
  },
  {
    id: "riverglades",
    kind: "lore",
    name: "Riverglades",
    subtitle: "New zone",
    color: "#62d9c4",
    glow: "#9ff2ff",
    position: [-12, -3, 11],
    radius: 1.3,
    look: "mist",
    lore: {
      atmosphere: "Teal water, low mist, and a hundred channels that all look like the right way until they aren't.",
      beats: ["Mist that sits on the water till noon", "Reeds, rope bridges, and something watching from the shallows", "Good fishing, worse footing"],
      coming: "Part of WoW: Forever's new zones at launch (Nov 4).",
    },
  },
  {
    id: "zephras-isle",
    kind: "lore",
    name: "Zephras Isle",
    subtitle: "New zone",
    color: "#f2d38a",
    glow: "#fff1c9",
    position: [-5, 8, -18],
    radius: 1.15,
    look: "gale",
    ring: { color: "#ffe2a0", tilt: 0.3 },
    lore: {
      atmosphere: "Gold grass flattened by a wind that never stops. The whole island leans the same way.",
      beats: ["Cliffs, gusts, and a long way down", "Sunlight that turns everything to brass", "Hold onto your hat. Hold onto everything."],
      coming: "Part of WoW: Forever's new zones at launch (Nov 4).",
    },
  },

  // —— uncharted (locked anomalies at the edge) ——————————————————————————
  {
    id: "the-deep",
    kind: "uncharted",
    name: "Uncharted",
    subtitle: "Anomaly",
    color: "#b98cff",
    glow: "#7cf2ff",
    position: [-28, 4, 7],
    radius: 1.0,
    look: "anomaly",
    tease: { line: "Something stirs in the deep…", hint: "Reserved for the next raid Blizzard announces." },
  },
  {
    id: "hardcore",
    kind: "uncharted",
    name: "Uncharted",
    subtitle: "Anomaly",
    color: "#ff6b5b",
    glow: "#ffb35c",
    position: [27, -3, 10],
    radius: 0.95,
    look: "anomaly",
    tease: { line: "A harsher world is forming. One life.", hint: "The Hardcore ruleset arrives after launch." },
  },
  {
    id: "signal",
    kind: "uncharted",
    name: "Uncharted",
    subtitle: "Anomaly",
    color: "#7cf2ff",
    glow: "#b98cff",
    position: [4, -6, -28],
    radius: 0.85,
    look: "anomaly",
    tease: { line: "A faint signal from the dark…", hint: "Guild events and seasonal content will surface here." },
  },
];

export const galaxyWorld = (id: string | null) => (id ? GALAXY.find((w) => w.id === id) ?? null : null);

export const KIND_LABEL: Record<WorldKind, string> = {
  guild: "Guild world",
  lore: "Lore world",
  uncharted: "Uncharted",
};
