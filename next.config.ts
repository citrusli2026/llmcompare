import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  distDir: 'dist',
  devIndicators: false,
  allowedDevOrigins: ['192.168.1.26'],
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
