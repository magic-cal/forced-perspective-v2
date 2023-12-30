import mkcert from "vite-plugin-mkcert";
import { defineConfig } from "vite";

export default defineConfig({
  base: "/forced-perspective-v2/",
  build: {
    outDir: "../dist",
    emptyOutDir: true,
  },

  plugins: [mkcert()],

  server: {
    port: 3000,
    https: true,
  },

  resolve: {
    alias: {
      "@": "/",
    },
  },
});
