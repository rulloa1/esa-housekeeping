import type { Metadata, Viewport } from "next";
import "./globals.css";
import { cookies } from "next/headers";
import { HOTEL_CONFIG, getHotelConfig } from "@/hotel.config";

export const metadata: Metadata = {
  title: {
    default: `${HOTEL_CONFIG.name} — Housekeeping`,
    template: `%s · ${HOTEL_CONFIG.shortName} Operations`,
  },
  description: `${HOTEL_CONFIG.tagline} for ${HOTEL_CONFIG.name} — ${HOTEL_CONFIG.location}`,
  applicationName: `${HOTEL_CONFIG.shortName} Operations`,
  appleWebApp: { title: `${HOTEL_CONFIG.shortName} Operations`, capable: true, statusBarStyle: "default" },
  icons: {
    icon: HOTEL_CONFIG.logoUrl || "/esa-logo.png",
    apple: "/apple-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: HOTEL_CONFIG.theme.primary,
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const presetId = cookieStore.get("hotel_preset")?.value;
  const hotel = presetId ? getHotelConfig(presetId) : HOTEL_CONFIG;

  // Dynamically inject CSS variables matching the active hotel configuration
  const dynamicThemeStyles = `
    :root {
      --color-primary: ${hotel.theme.primary};
      --color-primary-hover: ${hotel.theme.primaryHover};
      --color-accent: ${hotel.theme.accent};
      --esa-green: ${hotel.theme.primary};
      --esa-green-dark: ${hotel.theme.primaryDark};
      --esa-green-hover: ${hotel.theme.primaryHover};
      --esa-amber: ${hotel.theme.accent};
    }
  `;

  return (
    <html lang="en">
      <head>
        <style dangerouslySetInnerHTML={{ __html: dynamicThemeStyles }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
