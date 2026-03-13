import { ref, onUnmounted, type Ref } from "vue";
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

export function useCmsPage<K extends keyof PageMap>(path: K): Ref<PageMap[K]> {
  const state = ref({ ...pages[path] }) as Ref<PageMap[K]>;

  const cleanup = onPreviewMessage(`${String(path)}.page.json`, (fields: Record<string, unknown>) => {
    state.value = { ...state.value, ...fields } as PageMap[K];
  });

  onUnmounted(() => {
    cleanup();
  });

  return state;
}
