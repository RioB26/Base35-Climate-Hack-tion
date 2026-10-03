import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Relative base so the build works on GitHub Pages under any repo path.
export default defineConfig({
  base: "./",
  plugins: [react()],
  // MapLibre is lazy-loaded in its own chunk.
  build: { chunkSizeWarningLimit: 1200 },
});
