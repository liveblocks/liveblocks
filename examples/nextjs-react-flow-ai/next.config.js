/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: { root: __dirname },
  reactStrictMode: true,
  allowedDevOrigins: ["*.ngrok-free.app", "*.ngrok.io", "*.loca.lt"],
};

module.exports = nextConfig;
