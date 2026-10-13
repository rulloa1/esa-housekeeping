import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // app/housekeeping/route.ts reads the board from disk at request time.
  outputFileTracingIncludes: { "/housekeeping": ["./board/housekeeping.html"], "/welcome": ["./board/landing.html"] },
};

export default nextConfig;
