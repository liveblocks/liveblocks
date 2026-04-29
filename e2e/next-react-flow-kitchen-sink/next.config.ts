import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    resolveAlias: {
      "@xyflow/react": "./node_modules/@xyflow/react",
    },
  },
};

export default nextConfig;
