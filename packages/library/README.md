# @typescriptcms/library

Core plugin package for TypeScript CMS config processing.

## What it does

- Watches `*.config.json` files in your CMS directory.
- Generates sibling `.ts` files with typed constant exports.

## Usage

```ts
import { defineConfig } from "vite";
import typescriptcmsPlugin from "@typescriptcms/library";

export default defineConfig({
  plugins: [typescriptcmsPlugin({ cmsDir: "src/cms" })],
});
```
