/** @type {import('next').NextConfig} */

const nextConfig = {
  redirects: async () => {
    return [
      {
        source: "/",
        destination: "/reports",
        permanent: true,
      },
    ]
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        port: "",
        pathname: "/**",
      },
    ],
  },
}

export default nextConfig
