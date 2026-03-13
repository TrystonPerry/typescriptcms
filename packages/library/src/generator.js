import fs from "node:fs/promises";
import path from "node:path";

function toVarName(registryKey) {
  return "_" + registryKey.replace(/[/\\]/g, "_");
}

function toPascalCase(name) {
  return name
    .replace(/(?:^|[-_/\\])(\w)/g, (_, c) => c.toUpperCase())
    .replace(/[^A-Za-z0-9]/g, "");
}

async function findFiles(dir, suffix) {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }

  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await findFiles(fullPath, suffix)));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith(suffix)) {
      files.push(fullPath);
    }
  }

  return files;
}

// ── Config field → TS type string ───────────────────────

function fieldToTsType(item) {
  switch (item.type) {
    case "string":
      return "string";
    case "enum": {
      if (!Array.isArray(item.enum) || item.enum.length === 0) {
        throw new Error("Enum values are required");
      }
      return item.enum.map((v) => JSON.stringify(String(v))).join(" | ");
    }
    default:
      return "unknown";
  }
}

function fieldToValueLiteral(item) {
  if (item.value === undefined) {
    if (item.default === undefined) {
      throw new Error("Default value is required");
    }
    item.value = item.default;
  }

  switch (item.type) {
    case "string":
      return `${JSON.stringify(String(item.value))} as const`;
    case "enum": {
      if (!Array.isArray(item.enum) || item.enum.length === 0) {
        throw new Error("Enum values are required");
      }
      const enumType = item.enum.map((v) => JSON.stringify(String(v))).join(" | ");
      return `${JSON.stringify(String(item.value))} as ${enumType}`;
    }
    default:
      throw new Error(`Invalid type: ${item.type}`);
  }
}

// ── Content configs (existing .config.json outside components/) ──

async function processContentConfigs(cmsDirectory, framework) {
  const componentsDir = path.join(cmsDirectory, "components");
  const allConfigs = await findFiles(cmsDirectory, ".config.json");

  const contentConfigs = allConfigs.filter(
    (f) => !f.startsWith(componentsDir + path.sep) && !f.startsWith(componentsDir + "/"),
  );

  for (const jsonPath of contentConfigs) {
    const jsonContent = await fs.readFile(jsonPath, "utf-8");
    const jsonData = JSON.parse(jsonContent);

    const properties = [];

    for (const key of Object.keys(jsonData)) {
      properties.push(`${key}: ${fieldToValueLiteral(jsonData[key])}`);
    }

    const tsFilePath = jsonPath.replace(/\.config\.json$/, ".ts");
    const tsContent = `export default {\n${properties
      .map((line) => `  ${line},`)
      .join("\n")}\n};\n`;

    await fs.writeFile(tsFilePath, tsContent, "utf-8");
  }

  return contentConfigs;
}

// ── Component configs (components/*.config.json) ─────────

async function processComponentConfigs(cmsDirectory) {
  const componentsDir = path.join(cmsDirectory, "components");
  const configPaths = await findFiles(componentsDir, ".config.json");

  const components = [];

  for (const jsonPath of configPaths) {
    const jsonContent = await fs.readFile(jsonPath, "utf-8");
    const jsonData = JSON.parse(jsonContent);

    const name = path.basename(jsonPath, ".config.json");
    const interfaceName = toPascalCase(name) + "Props";

    const fields = [];
    for (const key of Object.keys(jsonData)) {
      const item = jsonData[key];
      if (!item.type) {
        fields.push({ key, tsType: "unknown" });
      } else {
        fields.push({ key, tsType: fieldToTsType(item) });
      }
    }

    components.push({ name, interfaceName, fields, configPath: jsonPath });
  }

  components.sort((a, b) => a.name.localeCompare(b.name));

  if (components.length > 0) {
    const lines = [];

    for (const comp of components) {
      lines.push(`export interface ${comp.interfaceName} {`);
      for (const field of comp.fields) {
        lines.push(`  ${field.key}: ${field.tsType};`);
      }
      lines.push(`  [key: string]: unknown;`);
      lines.push(`}`);
      lines.push(``);
    }

    lines.push(`export type ComponentRegistry = {`);
    for (const comp of components) {
      lines.push(`  ${comp.name}: ${comp.interfaceName};`);
    }
    lines.push(`};`);
    lines.push(``);

    lines.push(`export type ComponentName = keyof ComponentRegistry;`);
    lines.push(``);

    lines.push(`export type Section = {`);
    lines.push(`  [K in ComponentName]: { component: K; props: ComponentRegistry[K] }`);
    lines.push(`}[ComponentName];`);
    lines.push(``);

    const indexPath = path.join(componentsDir, "index.ts");
    await fs.writeFile(indexPath, lines.join("\n"), "utf-8");
  }

  return components;
}

// ── Page files (*.page.json) ─────────────────────────────

async function processPageFiles(cmsDirectory, components, framework) {
  const pageFiles = await findFiles(cmsDirectory, ".page.json");

  for (const jsonPath of pageFiles) {
    const jsonContent = await fs.readFile(jsonPath, "utf-8");
    const jsonData = JSON.parse(jsonContent);

    const tsFilePath = jsonPath.replace(/\.page\.json$/, ".page.ts");

    const lines = [];

    if (components.length > 0) {
      lines.push(`import type { Section } from "./components";`);

      const relFromFile = path.relative(path.dirname(jsonPath), path.join(cmsDirectory, "components"));
      const importPath = "./" + relFromFile.replace(/\\/g, "/");
      lines[0] = `import type { Section } from ${JSON.stringify(importPath)};`;
    }

    lines.push(``);
    lines.push(`export interface PageSeo {`);
    lines.push(`  title: string;`);
    lines.push(`  description: string;`);
    lines.push(`  ogTitle?: string;`);
    lines.push(`  ogDescription?: string;`);
    lines.push(`  ogImage?: string;`);
    lines.push(`  [key: string]: unknown;`);
    lines.push(`}`);
    lines.push(``);

    lines.push(`export interface Page {`);
    lines.push(`  seo: PageSeo;`);
    lines.push(`  sections: Section[];`);
    lines.push(`}`);
    lines.push(``);

    lines.push(`const page: Page = ${JSON.stringify(jsonData, null, 2)};`);
    lines.push(``);
    lines.push(`export default page;`);
    lines.push(``);

    await fs.writeFile(tsFilePath, lines.join("\n"), "utf-8");
  }

  return pageFiles;
}

// ── Index generation (content hook + page hook) ──────────

async function generateContentIndex(cmsDirectory, contentConfigs, framework) {
  const entries = contentConfigs.map((absPath) => {
    const relative = path.relative(cmsDirectory, absPath);
    const registryKey = relative.replace(/\.config\.json$/, "").replace(/\\/g, "/");
    const importPath = "./" + registryKey.replace(/\\/g, "/");
    const varName = toVarName(registryKey);
    return { registryKey, importPath, varName };
  });

  entries.sort((a, b) => a.registryKey.localeCompare(b.registryKey));

  if (entries.length === 0) return;

  const lines =
    framework === "vue"
      ? generateVueContentIndex(entries)
      : generateReactContentIndex(entries);

  const indexPath = path.join(cmsDirectory, "index.ts");
  await fs.writeFile(indexPath, lines.join("\n"), "utf-8");
}

async function generatePageIndex(cmsDirectory, pageFiles, framework) {
  if (pageFiles.length === 0) return;

  const entries = pageFiles.map((absPath) => {
    const relative = path.relative(cmsDirectory, absPath);
    const registryKey = relative.replace(/\.page\.json$/, "").replace(/\\/g, "/");
    const importPath = "./" + registryKey.replace(/\\/g, "/") + ".page";
    const varName = toVarName(registryKey) + "_page";
    return { registryKey, importPath, varName };
  });

  entries.sort((a, b) => a.registryKey.localeCompare(b.registryKey));

  const lines =
    framework === "vue"
      ? generateVuePageIndex(entries)
      : generateReactPageIndex(entries);

  const pagesIndexPath = path.join(cmsDirectory, "pages.ts");
  await fs.writeFile(pagesIndexPath, lines.join("\n"), "utf-8");
}

// ── Content index generators (React / Vue) ───────────────

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

function generateReactContentIndex(entries) {
  return [
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
}

function generateVueContentIndex(entries) {
  return [
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
}

// ── Page index generators (React / Vue) ──────────────────

function generatePageRegistry(entries) {
  const lines = [];

  lines.push(`import type { Page } from ${JSON.stringify(entries[0].importPath)};`);
  lines.push(`export type { Page, PageSeo, Section } from ${JSON.stringify(entries[0].importPath)};`);
  lines.push(``);

  for (const entry of entries) {
    lines.push(`import ${entry.varName} from ${JSON.stringify(entry.importPath)};`);
  }

  lines.push(``);
  lines.push(`type PageMap = {`);
  for (const entry of entries) {
    lines.push(`  ${JSON.stringify(entry.registryKey)}: typeof ${entry.varName};`);
  }
  lines.push(`};`);

  lines.push(``);
  lines.push(`const pages = {`);
  for (const entry of entries) {
    lines.push(`  ${JSON.stringify(entry.registryKey)}: ${entry.varName},`);
  }
  lines.push(`} satisfies Record<string, Page>;`);

  return lines;
}

function generateReactPageIndex(entries) {
  return [
    `import { useState, useEffect } from "react";`,
    `import { onPreviewMessage } from "@typescriptcms/library/preview";`,
    ``,
    ...generatePageRegistry(entries),
    ``,
    `export function useCmsPage<K extends keyof PageMap>(path: K): PageMap[K] {`,
    `  const initial = pages[path];`,
    `  const [state, setState] = useState(initial);`,
    ``,
    `  useEffect(() => {`,
    `    setState(pages[path]);`,
    ``,
    `    return onPreviewMessage(\`\${String(path)}.page.json\`, (fields: Record<string, unknown>) => {`,
    `      setState((prev) => ({ ...prev, ...fields } as PageMap[K]));`,
    `    });`,
    `  }, [path]);`,
    ``,
    `  return state;`,
    `}`,
    ``,
  ];
}

function generateVuePageIndex(entries) {
  return [
    `import { ref, onUnmounted, type Ref } from "vue";`,
    `import { onPreviewMessage } from "@typescriptcms/library/preview";`,
    ``,
    ...generatePageRegistry(entries),
    ``,
    `export function useCmsPage<K extends keyof PageMap>(path: K): Ref<PageMap[K]> {`,
    `  const state = ref({ ...pages[path] }) as Ref<PageMap[K]>;`,
    ``,
    `  const cleanup = onPreviewMessage(\`\${String(path)}.page.json\`, (fields: Record<string, unknown>) => {`,
    `    state.value = { ...state.value, ...fields } as PageMap[K];`,
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
}

// ── Main entry point ─────────────────────────────────────

/**
 * Generate typed TypeScript files from CMS config and page JSON files.
 *
 * @param {{ rootDir?: string, cmsDir?: string, framework?: "react" | "vue" }} options
 */
export async function generate(options = {}) {
  const rootDir = options.rootDir ?? process.cwd();
  const cmsDir = options.cmsDir ?? "src/cms";
  const framework = options.framework ?? "react";
  const cmsDirectory = path.resolve(rootDir, cmsDir);

  try {
    await fs.access(cmsDirectory);
  } catch (error) {
    const isMissingDir =
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "ENOENT";

    if (isMissingDir) return;
    throw error;
  }

  const contentConfigs = await processContentConfigs(cmsDirectory, framework);
  const components = await processComponentConfigs(cmsDirectory);
  const pageFiles = await processPageFiles(cmsDirectory, components, framework);

  if (contentConfigs.length > 0) {
    await generateContentIndex(cmsDirectory, contentConfigs, framework);
  }

  if (pageFiles.length > 0) {
    await generatePageIndex(cmsDirectory, pageFiles, framework);
  }
}
