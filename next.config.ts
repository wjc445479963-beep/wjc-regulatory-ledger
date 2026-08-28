import type { NextConfig } from "next";

const githubPagesBasePath = process.env.GITHUB_PAGES === "true" ? "/wjc-regulatory-ledger" : "";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  env: {
    NEXT_PUBLIC_BASE_PATH: githubPagesBasePath,
  },
};

export default nextConfig;
