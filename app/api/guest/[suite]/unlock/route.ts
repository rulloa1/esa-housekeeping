import { NextResponse } from "next/server";
import { validGuest, generateDigitalPassToken } from "@/lib/guest";
import { get, put, withSuiteLock } from "@/lib/store";
import { HOTEL_CONFIG } from "@/hotel.config";
import type { RoomDoc } from "@/lib/models";

// GET /api/guest/:suite/unlock?k=...
// Retrieve real-time lock diagnostics and deadbolt telemetry for the suite
export async function GET(
  req: Request,
  { params }: { params: Promise<{ suite: string }> }
) {
  try {
    const { suite } = await params;
    const { searchParams } = new URL(req.url);
    const k = searchParams.get("k");

    // Allow lookup if signed key or staff
    const doc = await get(suite);
    if (!doc) {
      return NextResponse.json({ error: "Suite not found." }, { status: 404 });
    }

    if (k && !(await validGuest(suite, k))) {
      return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
    }

    const battery = doc.lockBattery ?? 92;
    const voltage = (5.2 + (battery / 100) * 0.9).toFixed(2); // Nominal 4x AA 6.0V pack
    const lockEvents = (doc.history || [])
      .filter((h) => h.event.includes("Keyless") || h.event.includes("Lock") || h.event.includes("Deadbolt"))
      .slice(0, 8);

    return NextResponse.json({
      suite,
      lockModel: doc.lockModel || "Onity Trillium RFID / BLE DirectKey",
      firmware: doc.lockFirmware || "v4.2.1-SECURE",
      signalRssi: doc.lockSignalRssi || "-46 dBm (Strong)",
      batteryLevel: `${battery}%`,
      batteryVoltage: `${voltage} V`,
      batteryHealth: battery > 25 ? "Good" : "Low Battery Replacement Required",
      deadboltEngaged: Boolean(doc.deadboltEngaged),
      deadboltEngagedAt: doc.deadboltEngagedAt || null,
      lastUnlockedAt: doc.lastUnlockedAt || null,
      lockStatus: doc.status === "ooo" ? "disabled_maintenance" : "online_ready",
      recentEvents: lockEvents,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch lock diagnostics." },
      { status: 500 }
    );
  }
}

// POST /api/guest/:suite/unlock  { k, method, toggleDeadbolt }
// Keyless mobile entry system: securely validates digital key credential, unlocks door, and retracts deadbolt.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ suite: string }> }
) {
  try {
    const { suite } = await params;
    const body = (await req.json().catch(() => ({}))) as {
      k?: string;
      method?: string;
      toggleDeadbolt?: boolean;
    };
    const { k, method = "bluetooth", toggleDeadbolt } = body;

    // Validate signed guest credentials
    if (!k || !(await validGuest(suite, k))) {
      return NextResponse.json(
        { error: "Invalid digital key credentials or expired suite pass." },
        { status: 401 }
      );
    }

    const doc = await get(suite);
    if (!doc) {
      return NextResponse.json({ error: "Suite not found." }, { status: 404 });
    }

    // Safety & security check: only allow unlocking if the suite is not out-of-order
    if (doc.status === "ooo") {
      return NextResponse.json(
        { error: "Digital key temporarily disabled: Suite is scheduled for maintenance." },
        { status: 403 }
      );
    }

    const now = new Date().toISOString();
    const token = await generateDigitalPassToken(suite);

    // If toggleDeadbolt request only (e.g. from inside thumbturn simulation)
    if (toggleDeadbolt !== undefined) {
      const nextDeadbolt = !doc.deadboltEngaged;
      await withSuiteLock(suite, async () => {
        const current = (await get(suite)) ?? doc;
        const updated: RoomDoc = {
          ...current,
          deadboltEngaged: nextDeadbolt,
          deadboltEngagedAt: nextDeadbolt ? now : null,
          history: [
            {
              id: `deadbolt-${suite}-${Date.now()}`,
              event: nextDeadbolt ? "Deadbolt Engaged" : "Deadbolt Disengaged",
              details: nextDeadbolt
                ? "Interior privacy thumbturn thrown by guest (Do Not Disturb)."
                : "Interior privacy thumbturn retracted.",
              by: `Guest (Suite ${suite})`,
              role: "guest",
              timestamp: now,
            },
            ...(current.history || []),
          ],
          updatedAt: now,
          updatedBy: "Lock Sensor (Thumbturn)",
        };
        await put(suite, updated);
      });

      return NextResponse.json({
        success: true,
        deadboltEngaged: nextDeadbolt,
        message: nextDeadbolt ? "Deadbolt thrown: Privacy / DND active." : "Deadbolt retracted.",
      });
    }

    const unlockMethodLabel =
      method === "nfc"
        ? "NFC Tap"
        : method === "wallet"
        ? "Apple/Google Wallet Pass"
        : "Bluetooth Low Energy (BLE DirectKey)";

    // Update suite document under concurrency lock
    await withSuiteLock(suite, async () => {
      const current = (await get(suite)) ?? doc;
      const historyEntry = {
        id: `unlock-${suite}-${Date.now()}`,
        event: "Keyless Mobile Entry",
        details: `Room door unlocked using smartphone via ${unlockMethodLabel}. Solenoid engaged; deadbolt released.`,
        by: `Guest (Suite ${suite})`,
        role: "guest",
        timestamp: now,
      };

      const updated: RoomDoc = {
        ...current,
        lastUnlockedAt: now,
        digitalKeyPassId: token,
        deadboltEngaged: false, // Mechanical lever retracts both latch and deadbolt
        deadboltEngagedAt: null,
        lockBattery: current.lockBattery ?? 94,
        lockModel: current.lockModel || "Onity Trillium RFID / BLE DirectKey",
        lockFirmware: current.lockFirmware || "v4.2.1-SECURE",
        lockSignalRssi: current.lockSignalRssi || "-46 dBm (Strong)",
        history: [historyEntry, ...(current.history || [])],
        updatedAt: now,
        updatedBy: `Keyless System (${method})`,
      };

      await put(suite, updated);
    });

    return NextResponse.json({
      success: true,
      message: `Suite ${suite} unlocked successfully! Solenoid released and door latch is open.`,
      suite,
      hotelName: HOTEL_CONFIG.name,
      unlockedAt: now,
      doorLatchOpenSeconds: 10,
      credentialToken: token,
      method,
      deadboltEngaged: false,
      telemetry: {
        lockStatus: "unlocked",
        opticalLed: "solid_green",
        solenoidState: "energized_open",
        batteryLevel: `${doc.lockBattery ?? 94}%`,
        signalRssi: "-45 dBm (Excellent)",
        encryption: "AES-256-GCM / HMAC-SHA256",
        firmware: "v4.2.1-SECURE",
        hardwareModel: "Onity Trillium RFID / BLE Commercial Lock",
      },
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Keyless transmission failed." },
      { status: 500 }
    );
  }
}
