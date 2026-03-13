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

function toVarName(registryKey) {
  return "_" + registryKey.replace(/[/\\]/g, "_");
}

async function updateFiles(cmsDirectory, framework) {
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

  await generateIndex(cmsDirectory, configPaths, framework);
}

async function generateIndex(cmsDirectory, configPaths, framework) {
  const entries = configPaths.map((absPath) => {
    const relative = path.relative(cmsDirectory, absPath);
    const registryKey = relative.replace(/\.config\.json$/, "").replace(/\\/g, "/");
    const importPath = "./" + registryKey.replace(/\\/g, "/");
    const varName = toVarName(registryKey);
    return { registryKey, importPath, varName };
  });

  entries.sort((a, b) => a.registryKey.localeCompare(b.registryKey));

  const lines =
    framework === "vue"
      ? generateVueIndex(entries)
      : generateReactIndex(entries);

  const indexPath = path.join(cmsDirectory, "index.ts");
  await fs.writeFile(indexPath, lines.join("\n"), "utf-8");
}

function generateContentRegistry(entries) {
  const lines = [];

  for (const entry of entries) {
    lines.push(`import ${entry.varName} from ${JSON.stringify(entry.importPath)};`);
  }

  lines.push(``);
  lines.push(`type ContentMap = {`);
  for (const entry of entries) {
    lines.push(`  ${JSON.stringify(entry.registryKey)}: typeof ${entry.varName};`);
  }
  lines.push(`};`);

  lines.push(``);
  lines.push(`const content = {`);
  for (const entry of entries) {
    lines.push(`  ${JSON.stringify(entry.registryKey)}: ${entry.varName},`);
  }
  lines.push(`} satisfies ContentMap;`);

  return lines;
}

function generateReactIndex(entries) {
  const lines = [
    `import { useState, useEffect } from "react";`,
    `import { onPreviewMessage } from "@typescriptcms/library/preview";`,
    ``,
    ...generateContentRegistry(entries),
    ``,
    `export function useCmsContent<K extends keyof ContentMap>(path: K): ContentMap[K] {`,
    `  const initial = content[path];`,
    `  const [state, setState] = useState(initial);`,
    ``,
    `  useEffect(() => {`,
    `    setState(content[path]);`,
    ``,
    `    return onPreviewMessage(\`\${String(path)}.config.json\`, (fields: Record<string, unknown>) => {`,
    `      setState((prev) => ({ ...prev, ...fields }));`,
    `    });`,
    `  }, [path]);`,
    ``,
    `  return state;`,
    `}`,
    ``,
  ];
  return lines;
}

function generateVueIndex(entries) {
  const lines = [
    `import { ref, onUnmounted, type Ref } from "vue";`,
    `import { onPreviewMessage } from "@typescriptcms/library/preview";`,
    ``,
    ...generateContentRegistry(entries),
    ``,
    `export function useCmsContent<K extends keyof ContentMap>(path: K): Ref<ContentMap[K]> {`,
    `  const state = ref({ ...content[path] }) as Ref<ContentMap[K]>;`,
    ``,
    `  const cleanup = onPreviewMessage(\`\${String(path)}.config.json\`, (fields: Record<string, unknown>) => {`,
    `    state.value = { ...state.value, ...fields } as ContentMap[K];`,
    `  });`,
    ``,
    `  onUnmounted(() => {`,
    `    cleanup();`,
    `  });`,
    ``,
    `  return state;`,
    `}`,
    ``,
  ];
  return lines;
}

export default function typescriptcmsPlugin(options = {}) {
  const cmsDir = options.cmsDir ?? "src/cms";
  const framework = options.framework ?? "react";
  let rootDir = process.cwd();

  async function run() {
    const cmsDirectory = getResolvedCmsDir(rootDir, cmsDir);

    try {
      await fs.access(cmsDirectory);
      await updateFiles(cmsDirectory, framework);
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
