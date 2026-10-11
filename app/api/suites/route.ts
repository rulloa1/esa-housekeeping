import { NextResponse } from "next/server";
import { getRole } from "@/lib/auth";
import { getAll, getVersion } from "@/lib/store";

export const dynamic = "force-dynamic";

// GET /api/suites?since=<version>
// Returns { version, docs } or, when nothing changed since `since`, { version, unchanged: true }.
export async function GET(req: Request) {
  if (!(await getRole())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const since = new URL(req.url).searchParams.get("since");
  if (since !== null && Number(since) === (await getVersion())) {
    return NextResponse.json({ version: Number(since), unchanged: true });
  }
  return NextResponse.json(await getAll());
}
