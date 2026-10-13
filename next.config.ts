import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Every page reads live guild data, so we render dynamically and skip Cache
  // Components / PPR for now.
  serverExternalPackages: ["@electric-sql/pglite", "postgres"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
