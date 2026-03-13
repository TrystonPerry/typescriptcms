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

## Component Registry

Define reusable component schemas in `cms/components/`. Each `.config.json` file defines the editable props for one component using the same field format as content configs:

```jsonc
// src/cms/components/PageHero.config.json
{
  "title": {
    "type": "string",
    "title": "Hero Title",
    "default": ""
  },
  "ctaText": {
    "type": "string",
    "title": "CTA Button Text",
    "default": "Learn More"
  },
  "imagePosition": {
    "type": "enum",
    "title": "Image Position",
    "enum": ["left", "right"],
    "default": "left"
  }
}
```

The plugin generates `cms/components/index.ts` with:
- Typed prop interfaces for each component (`PageHeroProps`, `SplitSectionProps`, etc.)
- A `ComponentRegistry` type mapping component names to their prop types
- A discriminated `Section` union type for use in page files

```ts
// auto-generated
export interface PageHeroProps {
  title: string;
  ctaText: string;
  imagePosition: "left" | "right";
  [key: string]: unknown;
}

export type ComponentRegistry = {
  PageHero: PageHeroProps;
  // ...
};

export type Section = {
  [K in ComponentName]: { component: K; props: ComponentRegistry[K] }
}[ComponentName];
```

Component configs in `cms/components/` are **not** included in `useCmsContent` — they only produce type definitions.

## Page Files

Page files (`.page.json`) compose pages from registered components. Each page has a fixed `seo` block and a `sections` array:

```jsonc
// src/cms/about.page.json
{
  "seo": {
    "title": "About Us | My Site",
    "description": "Learn more about us."
  },
  "sections": [
    {
      "component": "PageHero",
      "props": {
        "title": "About Us",
        "ctaText": "Get Started",
        "imagePosition": "left"
      }
    },
    {
      "component": "CtaSection",
      "props": {
        "title": "Ready to try it?",
        "subtitle": "Get started in minutes"
      }
    }
  ]
}
```

The plugin generates a typed `.page.ts` module for each page file and a `pages.ts` index with a `useCmsPage` hook/composable.

## Generated Files

The plugin generates three categories of files:

| Source | Generated | Description |
|---|---|---|
| `*.config.json` (outside `components/`) | `*.ts` + `index.ts` | Typed content modules + `useCmsContent` hook |
| `components/*.config.json` | `components/index.ts` | Prop interfaces + `ComponentRegistry` + `Section` type |
| `*.page.json` | `*.page.ts` + `pages.ts` | Typed page data + `useCmsPage` hook |

> Add all generated `.ts` files to `.gitignore`. Keep the `.config.json` and `.page.json` source files in version control.

## Using `useCmsContent`

For simple key-value content (settings, metadata, etc.):

### React / Next.js

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

## Using `useCmsPage`

For component-based pages with sections:

### React / Next.js

```tsx
import { useCmsPage } from "./cms/pages";
import type { ComponentRegistry } from "./cms/components";
import PageHero from "./components/PageHero";
import CtaSection from "./components/CtaSection";

const components: Record<keyof ComponentRegistry, React.ComponentType<any>> = {
  PageHero,
  CtaSection,
};

export default function AboutPage() {
  const page = useCmsPage("about");

  return (
    <>
      <title>{page.seo.title}</title>
      {page.sections.map((section, i) => {
        const Component = components[section.component];
        return <Component key={i} {...section.props} />;
      })}
    </>
  );
}
```

### Vue / Nuxt

```vue
<script setup lang="ts">
import { type Component } from "vue";
import { useCmsPage } from "./cms/pages";
import type { ComponentRegistry } from "./cms/components";
import PageHero from "./components/PageHero.vue";
import CtaSection from "./components/CtaSection.vue";

const components: Record<keyof ComponentRegistry, Component> = {
  PageHero,
  CtaSection,
};

const page = useCmsPage("about");
</script>

<template>
  <component
    v-for="(section, i) in page.sections"
    :key="i"
    :is="components[section.component]"
    v-bind="section.props"
  />
</template>
```

## Live Preview

When your site is loaded inside the TypeScript CMS admin panel's preview iframe, both `useCmsContent` and `useCmsPage` automatically listen for `postMessage` events and update content in real-time as fields are edited. No additional configuration is required — the hooks/composables handle this transparently.

The preview mechanism uses the `postMessage` API, so it works with any deployment (static sites, SSR, dev servers) and does not require the preview site to have filesystem or network access to the CMS.

## Serving the Admin UI & API

The `@typescriptcms/admin` package exports `createAdminApp()` — an Express middleware that handles all `/admin/**` routes (the Vue editor UI, the REST API, and GitHub OAuth). You mount it directly in your server so everything runs in a single process with no proxy required.

### Nuxt

Create a catch-all server route that mounts the admin middleware:

```ts
// server/routes/admin/[...].ts
import { fromNodeMiddleware } from "h3";
import express from "express";
import { createAdminApp } from "@typescriptcms/admin/server";

const app = express();
app.use(createAdminApp());

// Serve the built admin Vue client
const adminClientPath = new URL(
  "../../node_modules/@typescriptcms/admin/dist/client",
  import.meta.url,
).pathname;
app.use("/admin", express.static(adminClientPath));
app.get("/admin/*", (_req, res) => {
  res.sendFile(adminClientPath + "/index.html");
});

export default fromNodeMiddleware(app);
```

Set environment variables in your `.env`:

```bash
SESSION_SECRET=replace_me_with_a_random_secret

# GitHub mode
GITHUB_CLIENT_ID=your_client_id
GITHUB_CLIENT_SECRET=your_client_secret
ADMIN_SERVER_URL=https://your-site.com

# OR local disk mode (skips GitHub auth)
TYPESCRIPTCMS_CMS_PATH=cms
```

### Next.js

Use a catch-all API route:

```ts
// app/admin/[[...path]]/route.ts (App Router)
import express from "express";
import { createAdminApp } from "@typescriptcms/admin/server";
import path from "node:path";

const app = express();
app.use(createAdminApp());

const adminClientPath = path.resolve(
  "node_modules/@typescriptcms/admin/dist/client",
);
app.use("/admin", express.static(adminClientPath));
app.get("/admin/*", (_req, res) => {
  res.sendFile(path.join(adminClientPath, "index.html"));
});

function handler(req: Request) {
  return new Promise<Response>((resolve) => {
    const { pathname, search } = new URL(req.url);
    const fakeReq = Object.assign(
      new (require("stream").Readable)({ read() {} }),
      {
        method: req.method,
        url: pathname + search,
        headers: Object.fromEntries(req.headers),
      },
    );
    if (req.body) {
      req.arrayBuffer().then((buf) => {
        fakeReq.push(Buffer.from(buf));
        fakeReq.push(null);
      });
    } else {
      fakeReq.push(null);
    }

    const chunks: Buffer[] = [];
    const fakeRes = new (require("stream").Writable)({
      write(chunk: Buffer, _: string, cb: () => void) {
        chunks.push(chunk);
        cb();
      },
    }) as any;

    let statusCode = 200;
    const resHeaders = new Headers();

    fakeRes.writeHead = (code: number, headers?: Record<string, string>) => {
      statusCode = code;
      if (headers) Object.entries(headers).forEach(([k, v]) => resHeaders.set(k, v));
    };
    fakeRes.setHeader = (k: string, v: string) => resHeaders.set(k, v);
    fakeRes.getHeader = (k: string) => resHeaders.get(k);
    fakeRes.statusCode = statusCode;
    Object.defineProperty(fakeRes, "statusCode", {
      get: () => statusCode,
      set: (v: number) => { statusCode = v; },
    });

    fakeRes.on("finish", () => {
      resolve(new Response(Buffer.concat(chunks), { status: statusCode, headers: resHeaders }));
    });

    app(fakeReq, fakeRes);
  });
}

export { handler as GET, handler as POST, handler as PUT, handler as DELETE };
```

> The Next.js adapter above bridges the Web Request/Response API to Express. For a simpler setup, use a [custom Next.js server](https://nextjs.org/docs/app/building-your-application/configuring/custom-server) with Express and mount `createAdminApp()` directly.

### Express / Node.js

```ts
import express from "express";
import path from "node:path";
import { createAdminApp } from "@typescriptcms/admin/server";

const app = express();
app.use(createAdminApp());

const adminClientPath = path.resolve(
  "node_modules/@typescriptcms/admin/dist/client",
);
app.use("/admin", express.static(adminClientPath));
app.get("/admin/*", (_req, res) => {
  res.sendFile(path.join(adminClientPath, "index.html"));
});

app.listen(3000);
```

### `createAdminApp` Options

All options fall back to environment variables when omitted:

| Option               | Env Variable              | Description                                      |
| -------------------- | ------------------------- | ------------------------------------------------ |
| `githubClientId`     | `GITHUB_CLIENT_ID`        | GitHub OAuth app client ID                        |
| `githubClientSecret` | `GITHUB_CLIENT_SECRET`    | GitHub OAuth app client secret                    |
| `serverUrl`          | `ADMIN_SERVER_URL`        | Public URL of the server (for OAuth redirects)    |
| `sessionSecret`      | `SESSION_SECRET`          | Cookie signing secret                             |
| `cmsPath`            | `TYPESCRIPTCMS_CMS_PATH`  | Local CMS directory path (enables local mode)     |

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
