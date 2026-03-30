import { withWorkflow } from "workflow/next";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Allow webhooks with ngrok and localtunnel
  allowedDevOrigins: ["*.ngrok-free.app", "*.loca.lt"],
};

export default withWorkflow(nextConfig);
