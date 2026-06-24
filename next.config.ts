import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // better-sqlite3 είναι native module — δεν πρέπει να μπει στο bundle, μένει external.
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;
