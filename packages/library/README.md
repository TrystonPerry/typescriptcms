# @typescriptcms/library

A build-time CMS that turns JSON config files into fully typed TypeScript modules. It generates a type-safe `useCmsContent` hook (React) or composable (Vue) that also supports real-time live preview updates from the TypeScript CMS admin panel.

## Installation

```bash
npm install @typescriptcms/library
```

## CMS Config Format

Create `.config.json` files inside your CMS directory (default: `src/cms/`). Each file defines one content model.

```jsonc
// src/cms/home.config.json
{
  "title": {
    "type": "string",
    "title": "Site Title",
    "description": "The main title of the website.",
    "default": "My Site",
    "value": "My Site"
  },
  "theme": {
    "type": "enum",
    "title": "Theme",
    "enum": ["light", "dark", "system"],
    "default": "system",
    "value": "dark"
  }
}
```

### Field Properties

| Property      | Required | Description                                         |
| ------------- | -------- | --------------------------------------------------- |
| `type`        | Yes      | `"string"` or `"enum"`                              |
| `title`       | No       | Human-readable label shown in the admin UI           |
| `description` | No       | Help text shown in the admin UI                      |
| `default`     | Yes      | Fallback value used when `value` is not set          |
| `value`       | No       | Current value (falls back to `default` if omitted)   |
| `enum`        | Enum only| Array of allowed values for `"enum"` type fields     |
| `maxLength`   | No       | Max string length (used by admin validation)         |
| `minLength`   | No       | Min string length (used by admin validation)         |
| `pattern`     | No       | Regex pattern for string validation                  |

### Directory Structure

Config files can be nested in subdirectories. The directory path becomes the content key:

```
src/cms/
  home.config.json        → useCmsContent("home")
  about.config.json       → useCmsContent("about")
  blog/
    meta.config.json      → useCmsContent("blog/meta")
    sidebar.config.json   → useCmsContent("blog/sidebar")
```

## Framework Setup

### React (Vite)

```ts
// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import typescriptcms from "@typescriptcms/library";

export default defineConfig({
  plugins: [react(), typescriptcms({ cmsDir: "src/cms" })],
});
```

The `framework` option defaults to `"react"` and can be omitted.

### Next.js

```js
// next.config.mjs
import { withTypescriptCms } from "@typescriptcms/library/next";

export default withTypescriptCms(
  {
    // your existing Next.js config
  },
  { cmsDir: "src/cms" },
);
```

This injects a webpack plugin that generates typed files before each compilation and watches the CMS directory for changes during development. The `framework` option defaults to `"react"`.

### Vue (Vite)

```ts
// vite.config.ts
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import typescriptcms from "@typescriptcms/library";

export default defineConfig({
  plugins: [vue(), typescriptcms({ cmsDir: "src/cms", framework: "vue" })],
});
```

### Nuxt

Register the Vite plugin inside your Nuxt config:

```ts
// nuxt.config.ts
import typescriptcms from "@typescriptcms/library";

export default defineNuxtConfig({
  vite: {
    plugins: [typescriptcms({ cmsDir: "cms", framework: "vue" })],
  },
});
```

Adjust `cmsDir` to match where your `.config.json` files live relative to the project root.

## Generated Files

For each `.config.json`, the plugin generates a sibling `.ts` file with a typed default export:

```ts
// src/cms/home.ts  (auto-generated — do not edit)
export default {
  title: "My Site" as const,
  theme: "dark" as "light" | "dark" | "system",
};
```

It also generates an `index.ts` in the CMS directory containing:
- Imports for every content module
- A typed `ContentMap` mapping content keys to their types
- A `useCmsContent` hook (React) or composable (Vue)

> Add `src/cms/index.ts` and `src/cms/**/*.ts` (but not `*.config.json`) to your `.gitignore` since these are auto-generated.

## Using `useCmsContent`

### React / Next.js

`useCmsContent` is a React hook that returns the content object directly. It re-renders the component when live preview updates arrive.

```tsx
import { useCmsContent } from "./cms";

export default function HomePage() {
  const home = useCmsContent("home");

  return (
    <h1>{home.title}</h1>
  );
}
```

**Return type:** `ContentMap[K]` — the plain content object. All values are fully typed with `as const` narrowing.

### Vue / Nuxt

`useCmsContent` is a Vue composable that returns a reactive `Ref`. In `<template>`, refs auto-unwrap so you can access properties directly.

```vue
<script setup lang="ts">
import { useCmsContent } from "./cms";

const home = useCmsContent("home");
</script>

<template>
  <h1>{{ home.title }}</h1>
</template>
```

**Return type:** `Ref<ContentMap[K]>` — a Vue ref wrapping the content object. Use `.value` in `<script>`, access properties directly in `<template>`.

## Live Preview

When your site is loaded inside the TypeScript CMS admin panel's preview iframe, `useCmsContent` automatically listens for `postMessage` events and updates the content in real-time as fields are edited. No additional configuration is required — the hook/composable handles this transparently.

The preview mechanism uses the `postMessage` API, so it works with any deployment (static sites, SSR, dev servers) and does not require the preview site to have filesystem or network access to the CMS.

## Plugin Options

| Option      | Default      | Description                              |
| ----------- | ------------ | ---------------------------------------- |
| `cmsDir`    | `"src/cms"`  | Path to the CMS directory (relative to project root) |
| `framework` | `"react"`    | `"react"` or `"vue"` — controls the generated hook/composable |

These options are the same for the Vite plugin and the Next.js `withTypescriptCms` wrapper.

## Exports

| Import path                        | Description                                  |
| ---------------------------------- | -------------------------------------------- |
| `@typescriptcms/library`           | Vite plugin (default export)                 |
| `@typescriptcms/library/next`      | `withTypescriptCms` for Next.js              |
| `@typescriptcms/library/preview`   | `onPreviewMessage` for custom integrations   |
| `@typescriptcms/library/generator` | `generate()` for programmatic/custom usage   |
