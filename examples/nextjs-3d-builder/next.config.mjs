/** @type {import('next').NextConfig} */

const nextConfig = {
  turbopack: { root: import.meta.dirname },
  reactStrictMode: true,
  transpilePackages: ["three", "@react-three/fiber", "@react-three/drei"],
};

export default nextConfig;
