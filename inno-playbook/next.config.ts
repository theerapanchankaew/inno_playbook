import type { NextConfig } from "next";

// ─── Deployment targets ───────────────────────────────────────────────────────
//
//  Environment          | BASE_PATH              | STATIC_EXPORT | GITHUB_ACTIONS
//  ─────────────────────┼────────────────────────┼───────────────┼───────────────
//  Local dev            | (not set)              | (not set)     | (not set)
//  GitHub Pages         | (not set)              | (not set)     | true
//  Docker / private     | (not set)              | true          | (not set)
//  mascipattadon.site   | /innovation_platform   | true          | (not set)
//  Custom host          | /your-path             | true          | (not set)
//
// To deploy at https://mascipattadon.site/innovation_platform/
// set in your build environment or .env file:
//   BASE_PATH=/innovation_platform
//   STATIC_EXPORT=true
// ─────────────────────────────────────────────────────────────────────────────

const isGithubActions = process.env.GITHUB_ACTIONS   === 'true';
const isStaticBuild   = process.env.STATIC_EXPORT    === 'true' || isGithubActions;

// Priority: BASE_PATH env var → GitHub Pages default → empty (root)
const basePath = process.env.BASE_PATH
  ? process.env.BASE_PATH          // e.g. /innovation_platform
  : isGithubActions
    ? '/inno_playbook'             // GitHub Pages: https://theerapanchankaew.github.io/inno_playbook/
    : '';                          // local dev / Docker at root

const nextConfig: NextConfig = {
  // Static export only for production builds — not during `npm run dev`
  ...(isStaticBuild && {
    output: 'export',
    trailingSlash: true,
  }),
  basePath,
  // assetPrefix must include trailing slash when basePath is set
  assetPrefix: isStaticBuild && basePath ? `${basePath}/` : '',
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
