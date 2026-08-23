import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ["@feedio/api-client"],
  images: {
    minimumCacheTTL: 86_400,
    deviceSizes: [640, 750, 1080, 1440, 1920],
  },
};

export default nextConfig;
