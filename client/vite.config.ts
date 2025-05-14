import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import mkcert from "vite-plugin-mkcert";
import path from "path";

export default defineConfig({
  base: "/forced-perspective-v2/",
  build: {
    outDir: "../dist",
    emptyOutDir: true,
  },

  plugins: [react(), mkcert()],

  server: {
    port: 3000,
    https: true,
  },

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@/components": path.resolve(__dirname, "./src/components"),
      "@/canvas": path.resolve(__dirname, "./src/components/canvas"),
      "@/dom": path.resolve(__dirname, "./src/components/dom"),
      "@/hooks": path.resolve(__dirname, "./src/hooks"),
      "@/store": path.resolve(__dirname, "./src/store"),
      "@/types": path.resolve(__dirname, "./src/types"),
      "@/utils": path.resolve(__dirname, "./src/utils"),
    },
  },
});
