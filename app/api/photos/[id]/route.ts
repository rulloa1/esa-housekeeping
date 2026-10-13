import { getSession } from "@/lib/auth";
import { loadPhoto } from "@/lib/photos";

export const dynamic = "force-dynamic";

// GET /api/photos/<id>: the photo, to signed-in staff only.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getSession())) return new Response("unauthorized", { status: 401 });
  const photo = await loadPhoto((await params).id);
  if (!photo) return new Response("not found", { status: 404 });
  return new Response(new Uint8Array(photo.bytes), {
    headers: {
      "Content-Type": photo.type,
      "Cache-Control": "private, max-age=86400, immutable",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'",
    },
  });
}
