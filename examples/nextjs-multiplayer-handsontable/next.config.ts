// This file is only needed when running this example inside the Liveblocks
// monorepo. Safe to delete if you copied this example to your own project.

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: { root: __dirname },
};

export default nextConfig;
