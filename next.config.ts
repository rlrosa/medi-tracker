// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    '192.168.87.3', 
    'medi-tracker-zeta.vercel.app'  // Add your ngrok URL here!
  ]
};

export default nextConfig;
