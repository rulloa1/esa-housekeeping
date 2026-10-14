// Universal Hotel Brand System (Template Configured)
import { HOTEL_CONFIG, getHotelConfig, HOTEL_PRESETS, type HotelPreset } from "@/hotel.config";

export { HOTEL_CONFIG, getHotelConfig, HOTEL_PRESETS, type HotelPreset };

export function getClientActivePresetId(): string {
  if (typeof document !== "undefined") {
    const match = document.cookie.match(/(?:^|; )hotel_preset=([^;]*)/);
    if (match && match[1] && HOTEL_PRESETS[match[1]]) {
      return match[1];
    }
  }
  return HOTEL_CONFIG.id;
}

export function getActiveHotel(): HotelPreset {
  const id = getClientActivePresetId();
  return HOTEL_PRESETS[id] || HOTEL_CONFIG;
}

export const BRAND = {
  get id(): string { return getActiveHotel().id; },
  get name(): string { return getActiveHotel().name; },
  get shortName(): string { return getActiveHotel().shortName; },
  get location(): string { return getActiveHotel().location; },
  get address(): string { return getActiveHotel().address; },
  get phone(): string { return getActiveHotel().phone; },
  get tagline(): string { return getActiveHotel().tagline; },
  get department(): string { return getActiveHotel().department; },
  get logo(): string { return getActiveHotel().logoUrl; },
  get logoUrl(): string { return getActiveHotel().logoUrl; },

  // Colors
  get green(): string { return getActiveHotel().theme.primary; }, // Legacy alias
  get darkGreen(): string { return getActiveHotel().theme.primaryDark; },
  get primaryHover(): string { return getActiveHotel().theme.primaryHover; },
  get secondary(): string { return getActiveHotel().theme.secondary; },
  get accent(): string { return getActiveHotel().theme.accent; },
  get text(): string { return getActiveHotel().theme.text; },
  get muted(): string { return getActiveHotel().theme.mutedText; },
  get border(): string { return getActiveHotel().theme.border; },
  get secondaryBg(): string { return getActiveHotel().theme.background; },
  font: "var(--font-family, 'Inter', system-ui, sans-serif)",
  radius: 8,

  // Rich Details
  get photos() { return getActiveHotel().photos; },
  get details() { return getActiveHotel().details; },
  get wifiSsid(): string { return getActiveHotel().details.wifiSsid; },
  get breakfast() { return getActiveHotel().details.breakfast; },
  get amenitiesList(): string[] { return getActiveHotel().details.amenitiesList; },
  get checkInTime(): string { return getActiveHotel().details.checkInTime; },
  get checkOutTime(): string { return getActiveHotel().details.checkOutTime; },
  get propertyLayout() { return getActiveHotel().propertyLayout; },
  get features() { return getActiveHotel().features; },
};
