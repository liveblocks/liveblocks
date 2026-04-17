/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: { root: __dirname },
  reactStrictMode: true,
  images: {
    domains: ["liveblocks.io"],
  },
  trailingSlash: true,
};

module.exports = nextConfig;
