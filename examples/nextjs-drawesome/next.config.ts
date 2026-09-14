import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const configDir = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  // Monorepo root (lockfile). Avoids Next picking a parent directory.
  turbopack: {
    root: path.join(configDir, "../.."),
  },
  reactStrictMode: true,
  // Examples are downloaded verbatim — don't generate agent rule files.
  agentRules: false,
};

export default nextConfig;
