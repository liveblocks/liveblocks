import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: { root: __dirname },
  reactStrictMode: true,
};

export default nextConfig;
