import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Relative base so the build works on GitHub Pages under any repo path.
export default defineConfig({
  base: "./",
  // One .env at the repo root serves the web app (VITE_ values) and the pipeline.
  envDir: "..",
  plugins: [react()],
  // MapLibre plus the bundled Natural Earth coastline, and three.js, each load lazily in their own chunk.
  build: { chunkSizeWarningLimit: 1700 },
});
