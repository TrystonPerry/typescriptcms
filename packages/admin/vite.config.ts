import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

const adminServerTarget =
  process.env.ADMIN_SERVER_URL ??
  `http://localhost:${process.env.ADMIN_SERVER_PORT ?? "5501"}`;

export default defineConfig({
  base: "/admin/",
  plugins: [vue()],
  server: {
    port: 5500,
    proxy: {
      "/admin/api": {
        target: adminServerTarget,
        changeOrigin: true,
      },
      "/admin/auth": {
        target: adminServerTarget,
        changeOrigin: true,
      },
    },
  },
});
