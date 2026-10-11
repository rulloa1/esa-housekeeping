import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Serve the standalone housekeeping board at /housekeeping without changing the URL.
  async rewrites() {
    return [{ source: "/housekeeping", destination: "/housekeeping.html" }];
  },
};

export default nextConfig;
