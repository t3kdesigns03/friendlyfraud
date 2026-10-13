import { REGIONS, RULESETS, type Region, type Ruleset } from "@/config/guild";

// WoW: Forever character identity: two-part name + region + ruleset.
// No realm. This shape is used for every lookup key and URL, and is what the
// Blizzard sync module (src/api) will map onto once a profile namespace exists.

export type CharacterIdentity = {
  firstName: string;
  secondName: string;
  region: Region;
  ruleset: Ruleset;
};

const NAME_PART = /^\p{L}{2,24}$/u;

export function validateNamePart(part: string, label: string): string | null {
  if (!part) return `${label} is required.`;
  if (!NAME_PART.test(part)) return `${label} must be 2–24 letters (no spaces, numbers or symbols).`;
  return null;
}

/** Trim and capitalize the first letter; keep the rest as typed (e.g. "McKay"). */
export function normalizeNamePart(part: string): string {
  const p = part.trim().normalize("NFC");
  return p ? p.charAt(0).toLocaleUpperCase() + p.slice(1) : p;
}

export function displayName(c: { firstName: string; secondName: string }) {
  return `${c.firstName} ${c.secondName}`;
}

/** URL-safe name segment: "thrall-stormcaller". */
export function nameSlug(c: { firstName: string; secondName: string }) {
  return `${c.firstName}-${c.secondName}`.toLocaleLowerCase();
}

/** Canonical identity key: "us/pvp/thrall-stormcaller". */
export function identityKey(c: CharacterIdentity) {
  return `${c.region}/${c.ruleset}/${nameSlug(c)}`;
}

export function characterPath(c: CharacterIdentity) {
  return `/characters/${c.region}/${c.ruleset}/${encodeURIComponent(nameSlug(c))}`;
}

export function parseIdentityParams(params: {
  region: string;
  ruleset: string;
  name: string;
}): { region: Region; ruleset: Ruleset; firstName: string; secondName: string } | null {
  const region = params.region.toLowerCase();
  const ruleset = params.ruleset.toLowerCase();
  if (!(REGIONS as readonly string[]).includes(region)) return null;
  if (!(RULESETS as readonly string[]).includes(ruleset)) return null;
  const parts = decodeURIComponent(params.name).split("-");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
  return { region: region as Region, ruleset: ruleset as Ruleset, firstName: parts[0], secondName: parts[1] };
}
