import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

const adminServerTarget =
  process.env.ADMIN_SERVER_URL ??
  `http://localhost:${process.env.ADMIN_SERVER_PORT ?? "8787"}`;

export default defineConfig({
  plugins: [vue()],
  server: {
    proxy: {
      "/api": {
        target: adminServerTarget,
        changeOrigin: true,
      },
      "/auth": {
        target: adminServerTarget,
        changeOrigin: true,
      },
    },
  },
});
