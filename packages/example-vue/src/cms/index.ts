import { ref, type Ref } from "vue";

import _home from "./home";

type ContentMap = {
  "home": typeof _home;
};

const content = {
  "home": _home,
} satisfies ContentMap;

export function useCmsContent<K extends keyof ContentMap>(path: K): Ref<ContentMap[K]> {
  const state = ref({ ...content[path] }) as Ref<ContentMap[K]>;

  return state;
}
