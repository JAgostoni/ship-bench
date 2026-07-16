import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Playwright uses http://127.0.0.1:3000; allow dev HMR / assets from that host
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;
