import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  distDir: 'dist',
  devIndicators: false,
  images: {
    unoptimized: true,
  },
  devIndicators: false,
};

export default nextConfig;
