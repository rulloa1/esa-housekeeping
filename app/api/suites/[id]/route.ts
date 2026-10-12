import { NextResponse } from "next/server";
import { getRole } from "@/lib/auth";
import { put, remove } from "@/lib/store";

export const dynamic = "force-dynamic";

const SUITE = /^[1-3](0[1-9]|[12]\d|3[0-2])$/; // 101–132, 201–232, 301–332

async function guard(id: string) {
  const role = await getRole();
  if (!role) return { error: NextResponse.json({ error: "unauthorized" }, { status: 401 }) };
  if (!SUITE.test(id)) return { error: NextResponse.json({ error: "unknown suite" }, { status: 400 }) };
  return { role };
}

// PUT /api/suites/:id with the suite's document as the JSON body.
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { error, role } = await guard(id);
  if (error) return error;
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "body must be an object" }, { status: 400 });
  }
  const version = await put(id, { ...body, updatedBy: role });
  return NextResponse.json({ version });
}

// DELETE /api/suites/:id clears the suite's log.
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { error } = await guard(id);
  if (error) return error;
  return NextResponse.json({ version: await remove(id) });
}
