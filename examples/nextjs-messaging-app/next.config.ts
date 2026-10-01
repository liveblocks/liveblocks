import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const configDir = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  // Monorepo root (lockfile). Avoids Next picking a parent directory (e.g. another lockfile).
  turbopack: {
    root: path.join(configDir, "../.."),
  },
  // The e2e suite starts its own dev server beside the one you may already
  // have running, so it needs a separate build directory.
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  // In that server, the dev tools badge would sit over the rail's user menu
  // and swallow clicks.
  devIndicators: process.env.NEXT_DIST_DIR ? false : undefined,
};

export default nextConfig;
