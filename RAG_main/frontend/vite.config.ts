import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // Allow serving files from parent repo root (where node_modules/@fontsource lives)
  server: {
    fs: {
      allow: [
        // allow the repo root (one level up from /frontend)
        path.resolve(__dirname, ".."),
        // keep frontend node_modules just in case
        path.resolve(__dirname, "node_modules"),
      ],
    },
  },
});
