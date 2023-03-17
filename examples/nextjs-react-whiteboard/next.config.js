/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ["liveblocks.io"],
  },
  trailingSlash: true,
};

module.exports = nextConfig;
