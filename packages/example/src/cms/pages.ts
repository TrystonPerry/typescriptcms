import { useState, useEffect } from "react";
import { onPreviewMessage } from "@typescriptcms/library/preview";

import type { Page } from "./about.page";
export type { Page, PageSeo, Section } from "./about.page";

import _about_page from "./about.page";

type PageMap = {
  "about": typeof _about_page;
};

const pages = {
  "about": _about_page,
} satisfies Record<string, Page>;

export function useCmsPage<K extends keyof PageMap>(path: K): PageMap[K] {
  const initial = pages[path];
  const [state, setState] = useState(initial);

  useEffect(() => {
    setState(pages[path]);

    return onPreviewMessage(`${String(path)}.page.json`, (fields: Record<string, unknown>) => {
      setState((prev) => ({ ...prev, ...fields } as PageMap[K]));
    });
  }, [path]);

  return state;
}
