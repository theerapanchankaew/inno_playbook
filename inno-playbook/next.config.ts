import type { NextConfig } from "next";

// Static export is used ONLY for production builds (GitHub Actions or Docker)
// During `npm run dev`, output is left as default so dynamic routes work normally
const isGithubActions  = process.env.GITHUB_ACTIONS   === 'true';
const isStaticBuild    = process.env.STATIC_EXPORT     === 'true' || isGithubActions;
const repoName         = 'inno_playbook';

const nextConfig: NextConfig = {
  // Only enable static export when building for GitHub Pages or Docker
  ...(isStaticBuild && {
    output: 'export',
    trailingSlash: true,
  }),
  basePath:    isGithubActions ? `/${repoName}` : '',
  assetPrefix: isGithubActions ? `/${repoName}/` : '',
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
