import type { NextConfig } from "next";

// GitHub Actions sets GITHUB_ACTIONS=true automatically
const isGithubActions = process.env.GITHUB_ACTIONS === 'true';
const repoName = 'inno_playbook';

const nextConfig: NextConfig = {
  output: 'export',                                    // static HTML export
  trailingSlash: true,                                 // /page → /page/index.html
  basePath: isGithubActions ? `/${repoName}` : '',    // /inno_playbook on GH Pages
  assetPrefix: isGithubActions ? `/${repoName}/` : '', // assets path
  images: {
    unoptimized: true,                                 // required for static export
  },
};

export default nextConfig;
