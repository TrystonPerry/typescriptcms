import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import typescriptcmsPlugin from "@typescriptcms/library";

const adminServerTarget =
  process.env.ADMIN_SERVER_URL ??
  `http://localhost:${process.env.ADMIN_SERVER_PORT ?? "8787"}`;

export default defineConfig({
  plugins: [react(), typescriptcmsPlugin({ cmsDir: "src/cms" })],
  server: {
    proxy: {
      "/api": {
        target: adminServerTarget,
        changeOrigin: true,
      },
    },
  },
});
