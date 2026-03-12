export interface PreviewSnapshotField {
  value?: unknown;
}

export interface PreviewSnapshotFile {
  path: string;
  content?: Record<string, PreviewSnapshotField>;
}

export interface PreviewSnapshot {
  files?: PreviewSnapshotFile[];
}

export async function applyPreviewOverlay<T extends Record<string, unknown>>(options: {
  base: T;
  configPath: string;
}): Promise<T> {
  const params = new URLSearchParams(window.location.search);
  const previewSessionId = params.get("previewSession");

  if (!previewSessionId) {
    return options.base;
  }

  try {
    const response = await fetch(
      `/api/preview/sessions/${encodeURIComponent(previewSessionId)}/snapshot`,
      {
        credentials: "include",
      },
    );

    if (!response.ok) {
      return options.base;
    }

    const snapshot = (await response.json()) as PreviewSnapshot;
    const target = snapshot.files?.find((file) => file.path === options.configPath);

    if (!target?.content) {
      return options.base;
    }

    const overlay = { ...options.base } as Record<string, unknown>;

    for (const [key, field] of Object.entries(target.content)) {
      if (!(key in overlay) || !field) {
        continue;
      }

      if (field.value !== undefined) {
        overlay[key] = field.value;
      }
    }

    return overlay as T;
  } catch {
    return options.base;
  }
}
