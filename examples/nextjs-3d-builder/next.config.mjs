/** @type {import('next').NextConfig} */

const nextConfig = {
  turbopack: { root: __dirname },
  reactStrictMode: true,
  transpilePackages: ["three", "@react-three/fiber", "@react-three/drei"],
};

export default nextConfig;
