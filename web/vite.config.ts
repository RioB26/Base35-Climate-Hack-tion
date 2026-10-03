import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Relative base so the build works on GitHub Pages under any repo path.
export default defineConfig({
  base: "./",
  plugins: [react()],
  // MapLibre plus the bundled Natural Earth coastline, and three.js, each load lazily in their own chunk.
  build: { chunkSizeWarningLimit: 1700 },
});
