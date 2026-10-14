/**
 * Universal Hotel Configuration & White-Label Template System
 * 
 * To switch the entire platform to a different hotel property:
 * 1. Change ACTIVE_HOTEL_ID below (or set HOTEL_ID / NEXT_PUBLIC_HOTEL_ID in .env.local).
 * 2. Or customize the 'custom' preset with your property's exact details, branding colors, and room counts.
 */

export interface HotelPreset {
  id: string;
  name: string;
  shortName: string;
  location: string;
  address: string;
  phone: string;
  tagline: string;
  department: string;
  logoUrl: string;
  theme: {
    primary: string; // Header & main brand color
    primaryDark: string; // Gradient accents
    primaryHover: string;
    secondary: string; // Supporting color
    accent: string; // CTA & highlight color (Gold / Amber / Bronze)
    background: string; // Page background
    surface: string; // Card surface
    text: string; // Main text
    mutedText: string; // Subtitle text
    border: string; // Divider & border color
  };
  propertyLayout: {
    floors: number;
    roomsPerFloor: number;
    roomTypes: string[];
  };
  features: {
    hasKitchenettes: boolean;
    hasBalconies: boolean;
    hasTurndownService: boolean;
    hasPool: boolean;
    hasRoomService: boolean;
  };
  photos: {
    hero: string; // Exterior building / main hero banner
    heroPortrait: string; // Mobile portrait background
    suite: string; // Signature King Suite / bedroom
    lobby: string; // Lobby / front reception
    pool: string; // Swimming pool / outdoor relaxation
    dining: string; // Restaurant / breakfast / kitchen
  };
  details: {
    wifiSsid: string;
    breakfast: {
      name: string;
      hours: string;
      location: string;
    };
    amenitiesList: string[];
    checkInTime: string;
    checkOutTime: string;
  };
}

export const HOTEL_PRESETS: Record<string, HotelPreset> = {
  // 1. Extended Stay America Suites (Default)
  esa: {
    id: "esa",
    name: "Extended Stay America Suites",
    shortName: "ESA",
    location: "Houston IAH Airport",
    address: "1500 N Sam Houston Pkwy E, Houston, TX 77032",
    phone: "(281) 442-8888",
    tagline: "Housekeeping Operations & Guest Portal",
    department: "Housekeeping",
    logoUrl: "/esa-logo.png",
    theme: {
      primary: "#1E3A8A", // Luxury Navy
      primaryDark: "#172554",
      primaryHover: "#1D4ED8",
      secondary: "#3B82F6",
      accent: "#A16207", // Warm Gold
      background: "#F8FAFC",
      surface: "#FFFFFF",
      text: "#0F172A",
      mutedText: "#64748B",
      border: "#E2E8F0",
    },
    propertyLayout: {
      floors: 3,
      roomsPerFloor: 32,
      roomTypes: ["Queen Studio", "King Suite", "Double Queen", "Deluxe Studio"],
    },
    features: {
      hasKitchenettes: true,
      hasBalconies: false,
      hasTurndownService: false,
      hasPool: true,
      hasRoomService: false,
    },
    photos: {
      hero: "/hotels/esa/hero.jpg",
      heroPortrait: "/hotels/esa/hero-portrait.jpg",
      suite: "/hotels/esa/suite.jpg",
      lobby: "/hotels/esa/lobby.jpg",
      pool: "/hotels/esa/pool.jpg",
      dining: "/hotels/esa/dining.jpg",
    },
    details: {
      wifiSsid: "ESA_Guest_IAH",
      breakfast: {
        name: "Grab & Go Breakfast",
        hours: "6:00 – 9:30 AM",
        location: "Lobby Station",
      },
      amenitiesList: [
        "In-Suite Fully Equipped Kitchen",
        "Free Grab-and-Go Morning Breakfast",
        "24/7 On-Site Guest Laundry",
        "Pet-Friendly Studio Suites",
      ],
      checkInTime: "3:00 PM",
      checkOutTime: "11:00 AM",
    },
  },

  // 2. Hilton Garden Inn
  hilton: {
    id: "hilton",
    name: "Hilton Garden Inn",
    shortName: "Hilton",
    location: "Houston Downtown",
    address: "1200 Texas Ave, Houston, TX 77002",
    phone: "(713) 224-2200",
    tagline: "Hospitality Management & Room Operations",
    department: "Guest Services & Housekeeping",
    logoUrl: "/hotels/hilton/logo.svg",
    theme: {
      primary: "#002B49", // Hilton Deep Blue
      primaryDark: "#001829",
      primaryHover: "#003D66",
      secondary: "#0072CE",
      accent: "#C5A059", // Warm Champagne Gold
      background: "#F8FAFC",
      surface: "#FFFFFF",
      text: "#0A192F",
      mutedText: "#4A5568",
      border: "#E2E8F0",
    },
    propertyLayout: {
      floors: 4,
      roomsPerFloor: 25,
      roomTypes: ["King Room", "Two Queen Beds", "King Junior Suite", "Executive Corner Suite"],
    },
    features: {
      hasKitchenettes: false,
      hasBalconies: true,
      hasTurndownService: false,
      hasPool: true,
      hasRoomService: true,
    },
    photos: {
      hero: "/hotels/hilton/hero.jpg",
      heroPortrait: "/hotels/hilton/hero-portrait.jpg",
      suite: "/hotels/hilton/suite.jpg",
      lobby: "/hotels/hilton/lobby.jpg",
      pool: "/hotels/hilton/pool.jpg",
      dining: "/hotels/hilton/dining.jpg",
    },
    details: {
      wifiSsid: "Hilton_Honors_Guest",
      breakfast: {
        name: "The Garden Grille Cooked-to-Order",
        hours: "6:30 – 10:30 AM",
        location: "The Garden Grille Restaurant (1st Fl)",
      },
      amenitiesList: [
        "The Garden Grille & Full Bar",
        "Heated Indoor Pool & Whirlpool",
        "24/7 Fitness Center with Peloton",
        "Complimentary High-Speed Wi-Fi",
      ],
      checkInTime: "3:00 PM",
      checkOutTime: "12:00 PM",
    },
  },

  // 3. Courtyard by Marriott
  marriott: {
    id: "marriott",
    name: "Courtyard by Marriott",
    shortName: "Marriott",
    location: "Medical Center & NRG",
    address: "7702 Main St, Houston, TX 77030",
    phone: "(713) 668-4422",
    tagline: "Hotel Operations & Housekeeping Suite",
    department: "Housekeeping Operations",
    logoUrl: "/hotels/marriott/logo.svg",
    theme: {
      primary: "#8B1E28", // Marriott Classic Burgundy
      primaryDark: "#5E1119",
      primaryHover: "#AB2633",
      secondary: "#D97706",
      accent: "#D4AF37", // Elegant Gold
      background: "#FAF9F6",
      surface: "#FFFFFF",
      text: "#1F2937",
      mutedText: "#6B7280",
      border: "#E5E7EB",
    },
    propertyLayout: {
      floors: 3,
      roomsPerFloor: 30,
      roomTypes: ["King Guest Room", "Two Queen Guest Room", "Executive King Suite"],
    },
    features: {
      hasKitchenettes: false,
      hasBalconies: false,
      hasTurndownService: false,
      hasPool: true,
      hasRoomService: true,
    },
    photos: {
      hero: "/hotels/marriott/hero.jpg",
      heroPortrait: "/hotels/marriott/hero-portrait.jpg",
      suite: "/hotels/marriott/suite.jpg",
      lobby: "/hotels/marriott/lobby.jpg",
      pool: "/hotels/marriott/pool.jpg",
      dining: "/hotels/marriott/dining.jpg",
    },
    details: {
      wifiSsid: "Marriott_Guest_HighSpeed",
      breakfast: {
        name: "The Bistro Fresh Breakfast & Starbucks",
        hours: "6:30 – 10:00 AM",
        location: "The Bistro Lounge",
      },
      amenitiesList: [
        "The Bistro Restaurant & Starbucks Coffee",
        "Outdoor Courtyard with Fire Pit",
        "24/7 Fitness Center & Heated Pool",
        "The Market 24/7 Snacks & Essentials",
      ],
      checkInTime: "4:00 PM",
      checkOutTime: "11:00 AM",
    },
  },

  // 4. Grand Hyatt Resort & Spa
  hyatt: {
    id: "hyatt",
    name: "Grand Hyatt Resort & Spa",
    shortName: "Hyatt",
    location: "Riverwalk & Convention Center",
    address: "600 E Market St, San Antonio, TX 78205",
    phone: "(210) 224-1234",
    tagline: "Luxury Property Operations & Quality Assurance",
    department: "Rooms Division & Housekeeping",
    logoUrl: "/hotels/hyatt/logo.svg",
    theme: {
      primary: "#0F4C5C", // Deep Pacific Teal
      primaryDark: "#082830",
      primaryHover: "#16697A",
      secondary: "#38A3A5",
      accent: "#E36414", // Coral Amber
      background: "#F9FAF9",
      surface: "#FFFFFF",
      text: "#0F172A",
      mutedText: "#577590",
      border: "#E2E8F0",
    },
    propertyLayout: {
      floors: 5,
      roomsPerFloor: 20,
      roomTypes: ["Deluxe King", "Deluxe Double", "Grand Suite", "Presidential Suite"],
    },
    features: {
      hasKitchenettes: false,
      hasBalconies: true,
      hasTurndownService: true,
      hasPool: true,
      hasRoomService: true,
    },
    photos: {
      hero: "/hotels/hyatt/hero.jpg",
      heroPortrait: "/hotels/hyatt/hero-portrait.jpg",
      suite: "/hotels/hyatt/suite.jpg",
      lobby: "/hotels/hyatt/lobby.jpg",
      pool: "/hotels/hyatt/pool.jpg",
      dining: "/hotels/hyatt/dining.jpg",
    },
    details: {
      wifiSsid: "GrandHyatt_Resort_5G",
      breakfast: {
        name: "Grand Palm Veranda Breakfast & Brunch",
        hours: "6:30 – 11:00 AM",
        location: "Riverwalk Terrace Veranda",
      },
      amenitiesList: [
        "Lagoon Infinity Pool & Private Cabanas",
        "Riverwalk Waterfront Dining & Bar",
        "Full-Service Spa, Sauna & Steam Room",
        "Grand Club Executive VIP Lounge",
      ],
      checkInTime: "4:00 PM",
      checkOutTime: "12:00 PM",
    },
  },

  // 5. The Azure Sands Boutique Hotel
  boutique: {
    id: "boutique",
    name: "The Azure Sands Boutique Hotel",
    shortName: "The Azure",
    location: "South Beach & Waterfront",
    address: "100 Ocean Dr, Miami Beach, FL 33139",
    phone: "(305) 555-0199",
    tagline: "Boutique Hospitality & Suite Care",
    department: "Guest Experience & Housekeeping",
    logoUrl: "/hotels/boutique/logo.svg",
    theme: {
      primary: "#0F172A", // Midnight Slate
      primaryDark: "#020617",
      primaryHover: "#1E293B",
      secondary: "#059669",
      accent: "#10B981", // Emerald
      background: "#F8FAFC",
      surface: "#FFFFFF",
      text: "#0F172A",
      mutedText: "#64748B",
      border: "#E2E8F0",
    },
    propertyLayout: {
      floors: 3,
      roomsPerFloor: 16,
      roomTypes: ["Terrace Studio", "Oceanfront King", "Penthouse Suite"],
    },
    features: {
      hasKitchenettes: false,
      hasBalconies: true,
      hasTurndownService: true,
      hasPool: true,
      hasRoomService: true,
    },
    photos: {
      hero: "/hotels/boutique/hero.jpg",
      heroPortrait: "/hotels/boutique/hero-portrait.jpg",
      suite: "/hotels/boutique/suite.jpg",
      lobby: "/hotels/boutique/lobby.jpg",
      pool: "/hotels/boutique/pool.jpg",
      dining: "/hotels/boutique/dining.jpg",
    },
    details: {
      wifiSsid: "AzureSands_VIP_WiFi",
      breakfast: {
        name: "Artisanal Oceanfront Continental & Espresso",
        hours: "7:00 – 11:30 AM",
        location: "Oceanfront Sun Deck",
      },
      amenitiesList: [
        "Rooftop Plunge Pool & Sunset Cocktail Bar",
        "Complimentary Beach Cruiser Bicycles",
        "Private Oceanfront Beach Chairs & Umbrellas",
        "Organic Cold-Pressed Juice & Espresso Bar",
      ],
      checkInTime: "3:00 PM",
      checkOutTime: "12:00 PM",
    },
  },

  // 6. Fully Custom Property (Populated from Environment Variables or Custom Values)
  custom: {
    id: "custom",
    name: process.env.NEXT_PUBLIC_HOTEL_NAME || "The Grandview Hotel & Suites",
    shortName: process.env.NEXT_PUBLIC_HOTEL_SHORT_NAME || "Grandview",
    location: process.env.NEXT_PUBLIC_HOTEL_LOCATION || "Metropolitan Center",
    address: process.env.NEXT_PUBLIC_HOTEL_ADDRESS || "100 Main St, City, ST 12345",
    phone: process.env.NEXT_PUBLIC_HOTEL_PHONE || "(555) 123-4567",
    tagline: "Housekeeping & Operations Management",
    department: "Housekeeping Operations",
    logoUrl: process.env.NEXT_PUBLIC_HOTEL_LOGO || "/hotels/hilton/logo.svg",
    theme: {
      primary: process.env.NEXT_PUBLIC_HOTEL_PRIMARY || "#1E3A8A",
      primaryDark: "#172554",
      primaryHover: "#1D4ED8",
      secondary: "#3B82F6",
      accent: process.env.NEXT_PUBLIC_HOTEL_ACCENT || "#A16207",
      background: "#F8FAFC",
      surface: "#FFFFFF",
      text: "#0F172A",
      mutedText: "#64748B",
      border: "#E2E8F0",
    },
    propertyLayout: {
      floors: Number(process.env.NEXT_PUBLIC_HOTEL_FLOORS) || 3,
      roomsPerFloor: Number(process.env.NEXT_PUBLIC_HOTEL_ROOMS_PER_FLOOR) || 32,
      roomTypes: ["Standard King", "Double Queen", "Executive Suite"],
    },
    features: {
      hasKitchenettes: process.env.NEXT_PUBLIC_HOTEL_HAS_KITCHENETTES === "true",
      hasBalconies: process.env.NEXT_PUBLIC_HOTEL_HAS_BALCONIES === "true",
      hasTurndownService: false,
      hasPool: true,
      hasRoomService: false,
    },
    photos: {
      hero: "/hotels/custom/hero.jpg",
      heroPortrait: "/hotels/custom/hero-portrait.jpg",
      suite: "/hotels/custom/suite.jpg",
      lobby: "/hotels/custom/lobby.jpg",
      pool: "/hotels/custom/pool.jpg",
      dining: "/hotels/custom/dining.jpg",
    },
    details: {
      wifiSsid: "Hotel_Guest_WiFi",
      breakfast: {
        name: "Morning Complimentary Breakfast",
        hours: "6:30 – 10:00 AM",
        location: "Dining Area",
      },
      amenitiesList: [
        "Complimentary Morning Breakfast",
        "High-Speed Fiber Wi-Fi",
        "24/7 Fitness Center",
        "Business Center & Meeting Room",
      ],
      checkInTime: "3:00 PM",
      checkOutTime: "11:00 AM",
    },
  },
};

/**
 * Active Hotel Selector
 * Set HOTEL_PRESET in your environment to switch properties on the fly.
 * Supported presets: "esa", "hilton", "marriott", "hyatt", "boutique", "custom"
 */
export const ACTIVE_HOTEL_ID =
  (process.env.NEXT_PUBLIC_HOTEL_PRESET as keyof typeof HOTEL_PRESETS) ||
  (process.env.HOTEL_PRESET as keyof typeof HOTEL_PRESETS) ||
  "esa";

export function getHotelConfig(presetId: string = ACTIVE_HOTEL_ID): HotelPreset {
  return HOTEL_PRESETS[presetId] || HOTEL_PRESETS.esa;
}

export const HOTEL_CONFIG = getHotelConfig();
