import type { NextRequest } from "next/server";
import { syncAll } from "@/api";
import { authorizeMachineOrWriter } from "@/lib/machine-auth";

// POST /api/sync → sync every non-inactive character from Battle.net.
// Returns { dark: true, reason: "blizzard_sync_disabled" } while the flag is dark.
export async function POST(req: NextRequest) {
  if (!(await authorizeMachineOrWriter(req))) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  return Response.json(await syncAll(), { headers: { "Cache-Control": "no-store" } });
}
