import type { NextConfig } from "next";

const allowedDevOrigins = process.env.ALLOWED_DEV_ORIGINS
  ? process.env.ALLOWED_DEV_ORIGINS.split(",").map((o) => o.trim())
  : undefined;

const nextConfig: NextConfig = {
  output: 'export',
  distDir: 'dist',
  devIndicators: false,
  allowedDevOrigins,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
