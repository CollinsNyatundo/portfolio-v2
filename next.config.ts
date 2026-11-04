import createMDX from "@next/mdx";
import type { NextConfig } from "next";
import { staticSecurityHeaders } from "./lib/security-headers";

// Pages render per request so each response carries a fresh CSP nonce
// (D-28). Cache Components and Partial Prerendering are off because a
// prerendered static shell can't carry a per-request nonce.
const nextConfig: NextConfig = {
  pageExtensions: ["ts", "tsx", "mdx"],
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
  // The samples endpoint is static data (docs/05 §5); serve it from public/.
  async rewrites() {
    return [
      {
        source: "/api/demos/fraud/samples",
        destination: "/demos/fraud/samples.json",
      },
    ];
  },
  async headers() {
    return [{ source: "/(.*)", headers: staticSecurityHeaders }];
  },
};

// MDX compiles at build time into React components, so content needs no
// runtime eval and the strict CSP holds. Plugins are named as strings so
// Turbopack can load them. remark-frontmatter strips the YAML block, which
// scripts/build-content.ts validates separately.
const withMDX = createMDX({
  options: {
    remarkPlugins: ["remark-frontmatter", "remark-gfm"],
  },
});

export default withMDX(nextConfig);
