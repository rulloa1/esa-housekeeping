import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: { default: "ESA Housekeeping", template: "%s · ESA Housekeeping" },
  description: "Housekeeping tools for Extended Stay America Houston IAH Airport",
  applicationName: "ESA Housekeeping",
  appleWebApp: { title: "ESA Housekeeping", capable: true, statusBarStyle: "default" },
};

export const viewport: Viewport = { themeColor: "#338802" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'Arial, "Helvetica Neue", Helvetica, sans-serif', color: "#483729", background: "#f5f6f4" }}>{children}</body>
    </html>
  );
}
