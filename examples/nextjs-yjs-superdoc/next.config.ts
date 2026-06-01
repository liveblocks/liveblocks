import type { NextConfig } from "next";

/** @type {import('next').NextConfig} */
const nextConfig: NextConfig = {
  turbopack: { root: __dirname },
  // Hide Superdoc console warnings cause by it bundling Vue
  compiler: {
    define: {
      __VUE_OPTIONS_API__: true,
      __VUE_PROD_DEVTOOLS__: false,
      __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: false,
    },
  },
};

export default nextConfig;
