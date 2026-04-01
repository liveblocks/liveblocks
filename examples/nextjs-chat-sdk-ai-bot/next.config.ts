import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const configDir = path.dirname(fileURLToPath(import.meta.url));

const config: NextConfig = {
  // Monorepo root (lockfile). Avoids Next picking a parent directory (e.g. another lockfile).
  turbopack: {
    root: path.join(configDir, "../.."),
  },
};

export default config;
