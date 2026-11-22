import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import importPlugin from "eslint-plugin-import";
import tailwindcss from "eslint-plugin-tailwindcss";
import prettier from "eslint-config-prettier/flat";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["**/*.{js,jsx,mjs,ts,tsx,mts,cts}"],
    rules: importPlugin.flatConfigs.recommended.rules,
  },
  {
    files: ["**/*.{ts,tsx,mts,cts}"],
    rules: importPlugin.flatConfigs.typescript.rules,
  },
  tailwindcss.configs.recommended,
  {
    settings: {
      tailwindcss: { cssConfigPath: "./src/app/reader.css" },
    },
  },
  prettier,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Vendored Catalyst UI kit (Tailwind Plus license); kept byte-identical for clean upgrades.
    "src/components/catalyst/**",
  ]),
]);

export default eslintConfig;
