import type { Config } from "@netlify/functions";

// Netlify Scheduled Function: hourly WoW: Forever namespace probe.
// Calls the app's own endpoint so all probe logic lives in src/api.
// Needs PROBE_SECRET set in Netlify env; URL is provided by Netlify.

export default async function probeNamespace() {
  const base = process.env.URL;
  const secret = process.env.PROBE_SECRET;
  if (!base || !secret) {
    console.log("[probe] skipped: URL or PROBE_SECRET not set");
    return new Response("skipped", { status: 200 });
  }
  const headers = { Authorization: `Bearer ${secret}` };
  const res = await fetch(`${base}/api/probe`, { method: "POST", headers });
  const report = (await res.json().catch(() => ({}))) as { status?: string; namespaceDetected?: boolean };
  console.log(`[probe] ${res.status} ${report.status ?? "unknown"}`);

  // Keep synced profiles fresh once the namespace is live (no-op while dark).
  if (report.namespaceDetected) {
    const sync = await fetch(`${base}/api/sync`, { method: "POST", headers });
    console.log(`[sync] ${sync.status}`);
  }
  return new Response("ok");
}

export const config: Config = {
  schedule: "@hourly",
};
