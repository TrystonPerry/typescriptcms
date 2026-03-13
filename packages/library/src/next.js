import path from "node:path";
import { generate } from "./generator.js";

class TypescriptCmsWebpackPlugin {
  constructor(options) {
    this.cmsDir = options.cmsDir ?? "src/cms";
    this.framework = options.framework ?? "react";
  }

  apply(compiler) {
    const cmsDir = this.cmsDir;
    const framework = this.framework;
    const rootDir = compiler.context;
    const absCmsDir = path.resolve(rootDir, cmsDir);

    compiler.hooks.beforeCompile.tapPromise(
      "TypescriptCmsPlugin",
      async () => {
        await generate({ rootDir, cmsDir, framework });
      },
    );

    compiler.hooks.afterCompile.tap("TypescriptCmsPlugin", (compilation) => {
      compilation.contextDependencies.add(absCmsDir);
    });
  }
}

/**
 * Wrap a Next.js config to automatically generate typed CMS files.
 *
 * @param {import("next").NextConfig} nextConfig
 * @param {{ cmsDir?: string, framework?: "react" | "vue" }} [options]
 * @returns {import("next").NextConfig}
 */
export function withTypescriptCms(nextConfig = {}, options = {}) {
  const prevWebpack = nextConfig.webpack;

  return {
    ...nextConfig,
    webpack(config, context) {
      config.plugins.push(new TypescriptCmsWebpackPlugin(options));

      if (typeof prevWebpack === "function") {
        return prevWebpack(config, context);
      }
      return config;
    },
  };
}
