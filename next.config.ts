import type { NextConfig } from "next";

// The lab runs entirely in the browser, so it ships as a static export.
// GitHub Pages serves it under /weo-lab; the workflow sets PAGES_BASE_PATH.
const basePath = process.env.PAGES_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  output: "export",
  basePath,
  trailingSlash: true,
  images: { unoptimized: true },
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
  poweredByHeader: false,
};

export default nextConfig;
