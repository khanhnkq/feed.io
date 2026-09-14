import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ["@feedio/api-client"],
  images: {
    minimumCacheTTL: 86_400,
    deviceSizes: [640, 750, 1080, 1440, 1920],
  },
  async redirects() {
    return [
      {
        source: "/app/organizations/:slug/team",
        destination: "/app/organizations/:slug/members",
        permanent: true,
      },
    ];
  },
  async rewrites() {
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    return [
      {
        source: "/api/v1/:path*",
        destination: `${apiBase}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
