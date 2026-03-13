import { ref, type Ref } from "vue";

import type { Page } from "./about.page";
export type { Page, PageSeo } from "./about.page";
export type { Section } from "./components";

import _about_page from "./about.page";

type PageMap = {
  "about": typeof _about_page;
};

const pages = {
  "about": _about_page,
} satisfies Record<string, Page>;

export function useCmsPage<K extends keyof PageMap>(path: K): Ref<PageMap[K]> {
  const state = ref({ ...pages[path] }) as Ref<PageMap[K]>;

  return state;
}
