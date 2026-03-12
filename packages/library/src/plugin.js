import fs from "node:fs/promises";
import path from "node:path";

function getResolvedCmsDir(root, cmsDir) {
  return path.resolve(root, cmsDir);
}

async function findConfigFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await findConfigFiles(fullPath)));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith(".config.json")) {
      files.push(fullPath);
    }
  }

  return files;
}

async function updateFiles(cmsDirectory) {
  const configPaths = await findConfigFiles(cmsDirectory);

  for (const jsonPath of configPaths) {
    const jsonContent = await fs.readFile(jsonPath, "utf-8");
    const jsonData = JSON.parse(jsonContent);

    const properties = [];

    for (const key of Object.keys(jsonData)) {
      const item = jsonData[key];

      if (!item.type) {
        throw new Error(`Type is required for ${key}`);
      }

      if (item.value === undefined) {
        if (item.default === undefined) {
          throw new Error(`Default value is required for ${key}`);
        }

        item.value = item.default;
      }

      switch (item.type) {
        case "string":
          properties.push(`${key}: ${JSON.stringify(String(item.value))} as const`);
          break;
        case "enum": {
          if (!Array.isArray(item.enum) || item.enum.length === 0) {
            throw new Error(`Enum values are required for ${key}`);
          }

          const enumValues = item.enum
            .map((value) => JSON.stringify(String(value)))
            .join(" | ");

          properties.push(
            `${key}: ${JSON.stringify(String(item.value))} as ${enumValues}`,
          );
          break;
        }
        default:
          throw new Error(`Invalid type: ${item.type}`);
      }
    }

    const tsFilePath = jsonPath.replace(/\.config\.json$/, ".ts");
    const tsContent = `export default {\n${properties
      .map((line) => `  ${line},`)
      .join("\n")}\n};\n`;

    await fs.writeFile(tsFilePath, tsContent, "utf-8");
  }
}

export default function typescriptcmsPlugin(options = {}) {
  const cmsDir = options.cmsDir ?? "src/cms";
  let rootDir = process.cwd();

  async function run() {
    const cmsDirectory = getResolvedCmsDir(rootDir, cmsDir);

    try {
      await fs.access(cmsDirectory);
      await updateFiles(cmsDirectory);
    } catch (error) {
      const isMissingDir =
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "ENOENT";

      if (!isMissingDir) {
        throw error;
      }
    }
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
      const watchPath = path.join(getResolvedCmsDir(rootDir, cmsDir), "**/*.config.json");
      server.watcher.add(watchPath);
    },
  };
}
