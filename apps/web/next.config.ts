import "../../scripts/load-root-env.mjs";
import type { NextConfig } from "next";

const apiOrigin = process.env.API_ORIGIN ?? "http://localhost:3001";

const nextConfig: NextConfig = {
  agentRules: false,
  transpilePackages: ["@mystockjournal/shared"],
  experimental: {
    // Screenshot import waits on a vision model; Next's rewrite proxy defaults to 30s.
    proxyTimeout: 120_000,
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${apiOrigin}/:path*`,
      },
    ];
  },
};

export default nextConfig;
