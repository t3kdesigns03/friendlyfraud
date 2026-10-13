// Rename the guild here. One line.
export const GUILD_NAME = "Friendly Fraud";

// Times on the calendar are entered and shown in this zone ("guild time").
export const GUILD_TIMEZONE = "America/New_York";

// Default region for new characters.
export const DEFAULT_REGION: Region = "us";

export const GUILD_TAGLINE = "A WoW: Forever raiding guild";

export const LAUNCH_DATE = "2026-11-04";
export const RAID_UNLOCK_DATE = "2026-12-09";

// ---------------------------------------------------------------------------
// Game reference data. WoW: Forever is realmless: a character is identified by
// two-part name + region + ruleset. There is intentionally no realm anywhere.
// ---------------------------------------------------------------------------

export const REGIONS = ["us", "eu", "kr", "tw"] as const;
export type Region = (typeof REGIONS)[number];
export const REGION_LABELS: Record<Region, string> = {
  us: "Americas",
  eu: "Europe",
  kr: "Korea",
  tw: "Taiwan",
};

export const RULESETS = ["normal", "pvp", "rp", "hardcore"] as const;
export type Ruleset = (typeof RULESETS)[number];
export const RULESET_LABELS: Record<Ruleset, string> = {
  normal: "Normal",
  pvp: "PvP",
  rp: "Roleplaying",
  hardcore: "Hardcore",
};

export const ROLES = ["tank", "healer", "dps"] as const;
export type Role = (typeof ROLES)[number];
export const ROLE_LABELS: Record<Role, string> = {
  tank: "Tank",
  healer: "Healer",
  dps: "DPS",
};

export const CHARACTER_STATUSES = ["planned", "active", "inactive"] as const;
export type CharacterStatus = (typeof CHARACTER_STATUSES)[number];

// Official class colors (as used in-game / on the Armory).
export const CLASSES = {
  warrior: { name: "Warrior", color: "#C69B6D", roles: ["tank", "dps"] },
  paladin: { name: "Paladin", color: "#F48CBA", roles: ["tank", "healer", "dps"] },
  hunter: { name: "Hunter", color: "#AAD372", roles: ["dps"] },
  rogue: { name: "Rogue", color: "#FFF468", roles: ["dps"] },
  priest: { name: "Priest", color: "#FFFFFF", roles: ["healer", "dps"] },
  shaman: { name: "Shaman", color: "#0070DD", roles: ["tank", "healer", "dps"] },
  mage: { name: "Mage", color: "#3FC7EB", roles: ["dps"] },
  warlock: { name: "Warlock", color: "#8788EE", roles: ["dps"] },
  druid: { name: "Druid", color: "#FF7C0A", roles: ["tank", "healer", "dps"] },
} as const satisfies Record<string, { name: string; color: string; roles: readonly Role[] }>;
export type ClassId = keyof typeof CLASSES;
export const CLASS_IDS = Object.keys(CLASSES) as ClassId[];

// Faction for Skyborne hasn't been nailed down publicly; class/race combos are
// not enforced so new Forever combos don't need a code change.
export const RACES = {
  human: { name: "Human", faction: "alliance" },
  dwarf: { name: "Dwarf", faction: "alliance" },
  nightelf: { name: "Night Elf", faction: "alliance" },
  gnome: { name: "Gnome", faction: "alliance" },
  orc: { name: "Orc", faction: "horde" },
  undead: { name: "Undead", faction: "horde" },
  tauren: { name: "Tauren", faction: "horde" },
  troll: { name: "Troll", faction: "horde" },
  skyborne: { name: "Skyborne", faction: "unknown" },
} as const;
export type RaceId = keyof typeof RACES;
export const RACE_IDS = Object.keys(RACES) as RaceId[];

export const EVENT_KINDS = ["raid", "dungeon", "pvp", "social", "other"] as const;
export type EventKind = (typeof EVENT_KINDS)[number];
export const EVENT_KIND_LABELS: Record<EventKind, string> = {
  raid: "Raid",
  dungeon: "Dungeon night",
  pvp: "PvP",
  social: "Social",
  other: "Other",
};

export const ITEM_QUALITIES = ["uncommon", "rare", "epic", "legendary"] as const;
export type ItemQuality = (typeof ITEM_QUALITIES)[number];
export const QUALITY_COLORS: Record<ItemQuality, string> = {
  uncommon: "#1EFF00",
  rare: "#0070DD",
  epic: "#A335EE",
  legendary: "#FF8000",
};
