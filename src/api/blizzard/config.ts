import "server-only";
import { DEFAULT_REGION, type Region } from "@/config/guild";

// Everything about Forever's API shape is unknown until Blizzard ships it, so
// every guess is overridable by env var without a code change.

const list = (v: string | undefined, fallback: string[]) =>
  v
    ? v
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : fallback;

export function blizzardConfig() {
  return {
    clientId: process.env.BLIZZARD_CLIENT_ID ?? "",
    clientSecret: process.env.BLIZZARD_CLIENT_SECRET ?? "",
    region: (process.env.BLIZZARD_REGION as Region | undefined) ?? DEFAULT_REGION,
    tokenUrl: process.env.BLIZZARD_TOKEN_URL ?? "https://oauth.battle.net/token",
    // {region} is substituted. Override only for testing against a mock.
    apiBase: process.env.BLIZZARD_API_BASE ?? "https://{region}.api.blizzard.com",

    // Namespace "family" tags to try: namespace = `${kind}-${tag}-${region}`.
    // Classic Era is `classic1x`, progression Classic is `classic`.
    namespaceTags: list(process.env.BLIZZARD_FOREVER_NAMESPACE_TAGS, ["forever", "classicforever", "classic-forever"]),

    // Known-good namespace used as a control so "credentials broken" never
    // looks like "no namespace yet".
    controlNamespaceTag: process.env.BLIZZARD_CONTROL_NAMESPACE_TAG ?? "classic1x",

    // Candidate profile URL shapes for a realmless character. Placeholders:
    // {first} {second} {ruleset} — all lowercased & URL-encoded.
    profilePathTemplates: list(process.env.BLIZZARD_PROFILE_PATH_TEMPLATES, [
      "/profile/wow/character/{ruleset}/{first}-{second}",
      "/profile/wow/character/{first}-{second}",
    ]),

    // Optional explicit test subject ("First Second/ruleset"); otherwise the
    // probe uses the first active main on the roster.
    probeCharacter: process.env.BLIZZARD_PROBE_CHARACTER ?? "",

    // Hard kill switch: keeps sync dark even if the probe flips the flag.
    killSwitch: process.env.BLIZZARD_SYNC_DISABLED === "1",
  };
}

export type BlizzardConfig = ReturnType<typeof blizzardConfig>;

export function credentialsConfigured(cfg = blizzardConfig()) {
  return Boolean(cfg.clientId && cfg.clientSecret);
}

export function fillTemplate(template: string, c: { firstName: string; secondName: string; ruleset: string }) {
  const enc = (s: string) => encodeURIComponent(s.toLocaleLowerCase());
  return template
    .replaceAll("{first}", enc(c.firstName))
    .replaceAll("{second}", enc(c.secondName))
    .replaceAll("{ruleset}", enc(c.ruleset));
}
