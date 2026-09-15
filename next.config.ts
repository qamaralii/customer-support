import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Railway sets PORT env var — Next.js uses it automatically

  // Allow ngrok and any other dev tunnel hosts to load Next.js dev resources.
  // Add your current ngrok subdomain here whenever it changes.
  // Not needed in production (Railway).
  allowedDevOrigins: [
    "blush-winking-cytoplasm.ngrok-free.dev",
  ],

  // Allow the API to receive larger payloads from Langflow
  experimental: {
    serverActions: {
      bodySizeLimit: "4mb",
    },
  },
};

export default nextConfig;
