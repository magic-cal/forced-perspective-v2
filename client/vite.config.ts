import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import mkcert from "vite-plugin-mkcert";
import path from "path";

export default defineConfig({
  base: "/",
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },

  plugins: [react(), mkcert()],

  server: {
    port: Number(process.env.PORT) || 5173,
    https: false,
    host: true,
    proxy: (() => {
      const backendPort = process.env.VITE_BACKEND_PORT || process.env.BACKEND_PORT || "8080";
      const backendHost = process.env.VITE_BACKEND_HOST || "localhost";
      return {
        // Proxy Socket.IO requests to the backend service (runs HTTP on localhost by default)
        "/socket.io": {
          target: `http://${backendHost}:${backendPort}`,
          ws: true,
          changeOrigin: true,
          secure: false,
        },
      };
    })(),
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

  optimizeDeps: {
    include: ["three", "@react-three/fiber", "@react-three/drei"],
  },
});
