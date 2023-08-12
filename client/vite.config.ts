/** @type {import('vite').UserConfig} */
export default {
  root: "src",
  build: {
    outDir: "../dist",
    emptyOutDir: true,
  },

  server: {
    port: 3000,
  },

  resolve: {
    alias: {
      "@": "/",
    },
  },
};
