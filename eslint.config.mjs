import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // The Blizzard API module is a hard boundary: outside src/api, import "@/api" only.
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/api/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        { patterns: [{ group: ["@/api/*", "**/api/blizzard/**"], message: 'Import from "@/api" (the module facade) instead.' }] },
      ],
    },
  },
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", ".data/**", ".netlify/**"]),
]);

export default eslintConfig;
