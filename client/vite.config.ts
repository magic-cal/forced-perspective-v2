/** @type {import('vite').UserConfig} */

import basicSsl from "@vitejs/plugin-basic-ssl";
import { defineConfig } from "vite";

export default defineConfig({
  base: "/forced-perspective-v2/",
  build: {
    outDir: "../dist",
    emptyOutDir: true,
  },

  plugins: [basicSsl()],

  server: {
    // port: 3000,
    https: true,
  },

  resolve: {
    alias: {
      "@": "/",
    },
  },
});
