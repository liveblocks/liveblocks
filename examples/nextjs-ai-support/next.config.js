/** @type {import("next").NextConfig} */
const nextConfig = {
  turbopack: { root: __dirname },
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "liveblocks.io",
      },
    ],
  },
};

module.exports = nextConfig;
