import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  distDir: 'dist',
  devIndicators: false,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
