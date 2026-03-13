import path from "node:path";
import { generate } from "./generator.js";

export default function typescriptcmsPlugin(options = {}) {
  const cmsDir = options.cmsDir ?? "src/cms";
  const framework = options.framework ?? "react";
  let rootDir = process.cwd();

  async function run() {
    await generate({ rootDir, cmsDir, framework });
  }

  return {
    name: "typescriptcms-json-to-ts",
    configResolved(config) {
      rootDir = config.root;
    },
    buildStart: run,
    async handleHotUpdate({ file }) {
      if (!file.endsWith(".config.json")) {
        return;
      }

      await run();
    },
    configureServer(server) {
      const watchPath = path.join(
        path.resolve(rootDir, cmsDir),
        "**/*.config.json",
      );
      server.watcher.add(watchPath);
    },
  };
}
