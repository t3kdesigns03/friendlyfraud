import { db } from "@/lib/db";

export async function GET() {
  try {
    const d = await db();
    await d.query("select 1");
    return Response.json({ ok: true, db: d.mode }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return Response.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}
