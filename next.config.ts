import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  assetPrefix: './',
  images: {
    unoptimized: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
