import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import { defineConfig, globalIgnores } from "eslint/config";
import tseslint from "typescript-eslint";

export default defineConfig([
  globalIgnores(["dist/"]),
  js.configs.recommended,
  tseslint.configs.recommended,
  // React runs only in the extension's own source. Playwright's fixture callback is named
  // `use`, which the hooks rule would misread as a React hook.
  { files: ["src/**/*.{ts,tsx}"], extends: [reactHooks.configs.flat.recommended] },
]);
