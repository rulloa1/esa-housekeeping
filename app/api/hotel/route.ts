import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { HOTEL_PRESETS, getHotelConfig } from "@/hotel.config";
import { resetToDefault } from "@/lib/store";

export async function GET() {
  const cookieStore = await cookies();
  const presetId = cookieStore.get("hotel_preset")?.value || "esa";
  const current = getHotelConfig(presetId);
  return NextResponse.json({
    active: current,
    presets: Object.values(HOTEL_PRESETS),
  });
}

export async function POST(req: Request) {
  try {
    const { presetId } = await req.json();
    if (!presetId || !HOTEL_PRESETS[presetId]) {
      return NextResponse.json({ error: "Invalid hotel preset" }, { status: 400 });
    }

    const cookieStore = await cookies();
    cookieStore.set("hotel_preset", presetId, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365, // 1 year
      sameSite: "lax",
    });

    // Reset suites inventory to match new hotel property's layout and room types
    await resetToDefault(presetId);

    return NextResponse.json({
      success: true,
      active: HOTEL_PRESETS[presetId],
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to set hotel" },
      { status: 500 }
    );
  }
}
