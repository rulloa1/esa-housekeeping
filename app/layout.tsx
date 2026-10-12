import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Extended Stay America Suites — Housekeeping", template: "%s · ESA Housekeeping" },
  description: "Hospitality Operations Platform for Extended Stay America Suites — Houston IAH Airport",
  applicationName: "ESA Housekeeping",
  appleWebApp: { title: "ESA Housekeeping", capable: true, statusBarStyle: "default" },
  icons: {
    icon: "/esa-logo.png",
    apple: "/apple-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#2F7A1E",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
