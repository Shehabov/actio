import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// ADR-0003 decision 1. public/manifest.json is copied into dist/ unchanged, and the one entry
// point is emitted under the fixed name the manifest gives it, with no content hash.
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rolldownOptions: {
      input: { background: "src/background.ts" },
      output: { entryFileNames: "[name].js" },
    },
  },
});
