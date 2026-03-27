import type { NextConfig } from "next";
import path from "node:path";

const config: NextConfig = {
  // Monorepo root (lockfile). Avoids Next picking a parent directory (e.g. another lockfile).
  turbopack: {
    root: path.join(import.meta.dirname, "../.."),
  },
};

export default config;
