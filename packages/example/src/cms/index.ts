import { useState, useEffect } from "react";
import { onPreviewMessage } from "@typescriptcms/library/preview";

import _home from "./home";

type ContentMap = {
  "home": typeof _home;
};

const content = {
  "home": _home,
} satisfies ContentMap;

export function useCmsContent<K extends keyof ContentMap>(path: K): ContentMap[K] {
  const initial = content[path];
  const [state, setState] = useState(initial);

  useEffect(() => {
    setState(content[path]);

    return onPreviewMessage(`${String(path)}.config.json`, (fields: Record<string, unknown>) => {
      setState((prev) => ({ ...prev, ...fields }));
    });
  }, [path]);

  return state;
}
