import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { withWorkflow } from "workflow/next";

const configDir = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  // Monorepo root (lockfile). Avoids Next picking a parent directory (e.g. another lockfile).
  turbopack: {
    root: path.join(configDir, "../.."),
  },
  // The Cursor SDK ships prebuilt chunks (and native helpers) that must be
  // loaded from node_modules at runtime rather than bundled.
  serverExternalPackages: ["@cursor/sdk"],
};

export default withWorkflow(nextConfig);
