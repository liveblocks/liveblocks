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
  // Skills are read from `skills/` at runtime (lib/server/skills.ts), so the
  // folder has to ship with every server function: the API route that lists
  // them and the workflow steps that build the prompt.
  outputFileTracingIncludes: {
    "/**/*": ["./skills/**/*"],
  },
};

export default withWorkflow(nextConfig);
