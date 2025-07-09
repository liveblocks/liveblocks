/** @type {import("next").NextConfig} */
const nextConfig = {
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
