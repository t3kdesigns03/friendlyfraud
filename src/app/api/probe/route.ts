import { after, type NextRequest } from "next/server";
import { getApiStatus, runProbe, syncAll } from "@/api";
import { authorizeMachineOrWriter } from "@/lib/machine-auth";

// GET  /api/probe → current namespace status (public, no network calls)
// POST /api/probe → run the probe now (passcode session or `Authorization: Bearer $PROBE_SECRET`)

export async function GET() {
  return Response.json(await getApiStatus(), { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: NextRequest) {
  if (!(await authorizeMachineOrWriter(req))) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const report = await runProbe();
  if (report.namespaceDetected) {
    // First green run: pull profiles right away rather than waiting a cycle.
    after(async () => {
      await syncAll().catch((e) => console.error("[probe] post-detect sync failed", e));
    });
  }
  return Response.json(report, { headers: { "Cache-Control": "no-store" } });
}
