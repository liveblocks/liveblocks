/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: { root: __dirname },
  reactStrictMode: true,
  images: {
    domains: ["liveblocks.io"],
  },
};

module.exports = nextConfig;
