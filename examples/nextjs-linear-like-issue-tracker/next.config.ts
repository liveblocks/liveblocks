// This file is only needed when running this example inside the Liveblocks
// monorepo. Safe to delete if you copied this example to your own project.

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: { root: __dirname },
  allowedDevOrigins: ["*.ngrok-free.app", "*.ngrok.io", "*.loca.lt"],

  // https://nextjs.org/blog/next-16-3-instant-navigations
  cacheComponents: true,
  partialPrefetching: true,
};

export default nextConfig;
