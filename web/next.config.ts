import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root to this folder so a stray package-lock.json elsewhere
  // (e.g. in the home directory) doesn't get picked as the root.
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
