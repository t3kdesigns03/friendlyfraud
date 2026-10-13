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
  {
    // A render loop is imperative by design: every frame writes into the
    // camera, uniforms and pre-allocated objects held in refs, and the sky
    // uses randomness on purpose. Same carve-out as T3KDESIGNSHOME/BootyBae.
    files: ["src/components/scene/**", "src/components/explore/**", "src/components/galaxy/**"],
    rules: {
      "react-hooks/immutability": "off",
      "react-hooks/purity": "off",
    },
  },
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", ".data/**", ".netlify/**", ".shots/**"]),
]);

export default eslintConfig;
