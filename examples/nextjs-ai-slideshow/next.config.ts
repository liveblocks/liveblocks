import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const configDir = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  // Lets e2e runs use their own build directory, so `npm run e2e` and
  // `npm run dev:local` can run at the same time in one worktree.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // Monorepo root (lockfile). Avoids Next picking a parent directory (e.g. another lockfile).
  turbopack: {
    root: path.join(configDir, "../.."),
  },
};

export default nextConfig;
