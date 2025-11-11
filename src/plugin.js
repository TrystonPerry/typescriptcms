import fs from "fs/promises";
import path from "path";

async function updateFiles() {
  const dirPath = path.resolve(__dirname, "./cms");
  const files = await fs.readdir(dirPath);

  for (const file of files) {
    if (file.endsWith(".config.json")) {
      const jsonPath = path.join(dirPath, file);
      const jsonContent = await fs.readFile(jsonPath, "utf-8");
      const jsonData = JSON.parse(jsonContent);

      // Generate a TypeScript file path
      const tsFileName = file.replace(".config.json", ".ts");
      const tsFilePath = path.join(dirPath, tsFileName);

      const properties = [];

      for (const key in jsonData) {
        const item = jsonData[key];

        if (!item.type) {
          throw new Error(`Type is required for ${key}`);
        }

        if (!item.value) {
          if (item.default === undefined) {
            throw new Error(`Default value is required for ${key}`);
          }
          item.value = item.default;
        }

        switch (item.type) {
          case "string":
            properties.push(`${key}: "${item.value}" as const`);
            break;
          case "enum":
            const enumValues = item.enum
              .map((value) => `"${value}"`)
              .join(" | ");
            properties.push(`${key}: "${item.value}" as ${enumValues}`);
            break;
          default:
            throw new Error(`Invalid type: ${item.type}`);
        }
      }

      const tsContent = `export default {
            ${properties.map((p) => `  ${p},\n`).join("")}
          };`;

      await fs.writeFile(tsFilePath, tsContent, "utf-8");
    }
  }
}

export default function plugin() {
  return {
    name: "json-to-ts",
    buildStart: updateFiles,
    handleHotUpdate({ server, file }) {
      if (file.endsWith(".config.json")) {
        updateFiles();
      }
    },
    configureServer(server) {
      server.watcher.add(`./cms/**/*.config.json`);
    },
  };
}
