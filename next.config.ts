import type { NextConfig } from "next";
import { staticSecurityHeaders } from "./lib/security-headers";

// Pages render per request so each response carries a fresh CSP nonce
// (D-28). Cache Components and Partial Prerendering are off because a
// prerendered static shell can't carry a per-request nonce.
const nextConfig: NextConfig = {
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [{ source: "/(.*)", headers: staticSecurityHeaders }];
  },
};

export default nextConfig;
