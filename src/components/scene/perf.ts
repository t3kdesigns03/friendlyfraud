/**
 * Particle budgets. Tier 0 is a phone, tier 2 a desktop GPU. AdaptivePerf
 * walks the tier down at runtime if frames drop, so these are starting
 * guesses, not promises. Small screens never get bloom.
 */
export type Tier = 0 | 1 | 2;

export type TierConfig = {
  vortex: number;
  core: number;
  dust: number;
  stars: number;
  embers: number;
  shards: number;
  nebulae: number;
  dpr: number;
  bloom: boolean;
  worldSegments: number;
};

export const TIERS: Record<Tier, TierConfig> = {
  2: { vortex: 70000, core: 9000, dust: 9000, stars: 4200, embers: 420, shards: 26, nebulae: 4, dpr: 1.75, bloom: true, worldSegments: 56 },
  1: { vortex: 38000, core: 6000, dust: 5000, stars: 2600, embers: 260, shards: 18, nebulae: 3, dpr: 1.5, bloom: true, worldSegments: 44 },
  0: { vortex: 14000, core: 3000, dust: 0, stars: 1200, embers: 120, shards: 10, nebulae: 2, dpr: 1.25, bloom: false, worldSegments: 32 },
};

type Navigatorish = Navigator & { deviceMemory?: number };

export function isSmallScreen() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(max-width: 820px)").matches || window.matchMedia("(pointer: coarse)").matches;
}

export function detectTier(): Tier {
  if (typeof window === "undefined") return 1;
  const nav = navigator as Navigatorish;
  const cores = nav.hardwareConcurrency ?? 4;
  const mem = nav.deviceMemory ?? 4;
  if (isSmallScreen()) return 0;
  if (cores <= 4 || mem <= 4) return 1;
  return 2;
}

let probe: boolean | null = null;
export function hasWebGL(): boolean {
  if (typeof window === "undefined") return false;
  if (probe !== null) return probe;
  try {
    const c = document.createElement("canvas");
    probe = !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    probe = false;
  }
  return probe;
}

export function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
