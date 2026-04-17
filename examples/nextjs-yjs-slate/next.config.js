/** @type {import("next").NextConfig} */
const nextConfig = {
  turbopack: { root: __dirname },
  reactStrictMode: true,
  transpilePackages: ["@slate-yjs/react"],
};

module.exports = nextConfig;
