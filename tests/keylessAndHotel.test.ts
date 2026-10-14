import { describe, expect, it } from "vitest";
import { guestKey, validGuest, generateDigitalPassToken } from "@/lib/guest";
import { HOTEL_PRESETS, getHotelConfig } from "@/hotel.config";
import { get, put, withSuiteLock } from "@/lib/store";
import type { RoomDoc } from "@/lib/models";

describe("Digital Key & Keyless Entry Verification", () => {
  it("generates and verifies guest keys for suites", async () => {
    const suite = "214";
    const key = await guestKey(suite);
    expect(typeof key).toBe("string");
    expect(key.length).toBeGreaterThan(0);

    // Valid check
    const isValid = await validGuest(suite, key);
    expect(isValid).toBe(true);

    // Invalid check
    const isInvalid = await validGuest(suite, "wrong-key-1234");
    expect(isInvalid).toBe(false);

    // Bad suite
    const badSuite = await validGuest("", key);
    expect(badSuite).toBe(false);
  });

  it("generates secure digital pass tokens for NFC/Bluetooth mobile unlocking", async () => {
    const suite = "105";
    const token = await generateDigitalPassToken(suite);
    expect(token).toMatch(/^BLE-105-[A-Z0-9_-]{8}$/);
  });

  it("handles deadbolt and lock hardware telemetry on room docs", async () => {
    const suite = "202";
    let room = await get(suite);
    if (!room) {
      // Create baseline room
      const dummy: RoomDoc = {
        id: suite,
        floor: 2,
        type: "King Suite",
        status: "assigned",
        priority: "standard",
        serviceType: "stayover",
        attendant: "Maria S.",
        supervisor: "Supervisor Sarah J.",
        guestNote: null,
        instructions: null,
        startedAt: null,
        completedAt: null,
        inspectedAt: null,
        inspectedBy: null,
        inspectionResult: null,
        inspectionNotes: null,
        inspectionFailReasons: [],
        inspectionCategories: {},
        checklist: {},
        checklistNotes: {},
        maintenanceIssues: [],
        supplyRequests: [],
        history: [],
        lockBattery: 94,
        lockModel: "Onity Trillium DirectKey RFID/BLE",
        lockFirmware: "v4.2.1-SECURE",
        lockSignalRssi: "-45 dBm (Strong)",
        deadboltEngaged: true,
        updatedAt: new Date().toISOString(),
        updatedBy: "test",
      };
      await put(suite, dummy);
      room = dummy;
    }

    expect(room.lockModel).toBeDefined();
    expect(room.lockBattery).toBeGreaterThan(0);

    // Unlocking retracts deadbolt
    await withSuiteLock(suite, async () => {
      const current = (await get(suite))!;
      current.deadboltEngaged = false;
      current.lastUnlockedAt = new Date().toISOString();
      await put(suite, current);
    });

    const updated = await get(suite);
    expect(updated?.deadboltEngaged).toBe(false);
    expect(updated?.lastUnlockedAt).toBeDefined();
  });
});

describe("Universal Hotel Configuration & Brand Presets", () => {
  it("includes all standard white-label hotel presets", () => {
    expect(HOTEL_PRESETS.esa).toBeDefined();
    expect(HOTEL_PRESETS.hilton).toBeDefined();
    expect(HOTEL_PRESETS.marriott).toBeDefined();
    expect(HOTEL_PRESETS.hyatt).toBeDefined();
    expect(HOTEL_PRESETS.boutique).toBeDefined();
    expect(HOTEL_PRESETS.custom).toBeDefined();
  });

  it("loads default ESA configuration with correct layout and themes", () => {
    const config = getHotelConfig("esa");
    expect(config.id).toBe("esa");
    expect(config.name).toBe("Extended Stay America Suites");
    expect(config.theme.primary).toBe("#1E3A8A");
    expect(config.propertyLayout.floors).toBe(3);
    expect(config.propertyLayout.roomsPerFloor).toBe(41);
    expect(config.features.hasKitchenettes).toBe(true);
  });

  it("loads luxury and boutique hotel configs with bespoke styling", () => {
    const hilton = getHotelConfig("hilton");
    expect(hilton.theme.primary).toBe("#002B49");
    expect(hilton.features.hasRoomService).toBe(true);

    const boutique = getHotelConfig("boutique");
    expect(boutique.theme.primary).toBe("#0F172A");
    expect(boutique.propertyLayout.floors).toBe(3);
  });

  it("gracefully falls back to ESA preset when unknown id provided", () => {
    const fallback = getHotelConfig("unknown-hotel-id");
    expect(fallback.id).toBe("esa");
  });
});
