import { ref, onUnmounted, type Ref } from "vue";
import { onPreviewMessage } from "@typescriptcms/library/preview";

import _home from "./home";

type ContentMap = {
  "home": typeof _home;
};

const content = {
  "home": _home,
} satisfies ContentMap;

export function useCmsContent<K extends keyof ContentMap>(path: K): Ref<ContentMap[K]> {
  const state = ref({ ...content[path] }) as Ref<ContentMap[K]>;

  const cleanup = onPreviewMessage(`${String(path)}.config.json`, (fields: Record<string, unknown>) => {
    state.value = { ...state.value, ...fields } as ContentMap[K];
  });

  onUnmounted(() => {
    cleanup();
  });

  return state;
}
