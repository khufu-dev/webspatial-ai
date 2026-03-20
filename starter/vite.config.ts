import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import webspatial from "@webspatial/vite-plugin";

export default defineConfig({
  plugins: [
    react(),
    webspatial({ mode: 'avp', outputDir: "/" }),
  ],
  server: {
    open: true,
    host: true,
    headers: {
      "Cross-Origin-Embedder-Policy": "require-corp",
      "Cross-Origin-Opener-Policy": "same-origin",
    },
  },
});
