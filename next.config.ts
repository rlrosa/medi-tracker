// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    '192.168.87.3', 
    'aaba-104-4-233-29.ngrok-free.app'  // Add your ngrok URL here!
  ]
};

export default nextConfig;
