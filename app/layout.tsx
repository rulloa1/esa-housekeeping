import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ESA Housekeeping",
  description: "Housekeeping tools for Extended Stay America",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'Arial, "Helvetica Neue", Helvetica, sans-serif', color: "#483729" }}>{children}</body>
    </html>
  );
}
