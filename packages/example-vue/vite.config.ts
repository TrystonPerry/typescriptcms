import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import typescriptcmsPlugin from "@typescriptcms/library";

const adminTarget =
  process.env.ADMIN_URL ??
  `http://localhost:${process.env.ADMIN_PORT ?? "5500"}`;

export default defineConfig({
  plugins: [
    vue(),
    typescriptcmsPlugin({ cmsDir: "src/cms", framework: "vue" }),
  ],
  server: {
    proxy: {
      "/admin": {
        target: adminTarget,
        changeOrigin: true,
        ws: true,
      },
    },
  },
});
