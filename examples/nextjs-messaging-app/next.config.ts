import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const configDir = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  turbopack: {
    root: path.join(configDir, "../.."),
  },
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  devIndicators: process.env.NEXT_DIST_DIR ? false : undefined,
};

export default nextConfig;
