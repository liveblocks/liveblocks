/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: ["liveblocks.io"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "liveblocks.io",
        port: "",
        pathname: "/**",
      },
    ],
  },
};
module.exports = nextConfig;
