import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // MP photos from the Represent API
    remotePatterns: [{ protocol: "https", hostname: "www.ourcommons.ca" }],
  },
};

export default nextConfig;
