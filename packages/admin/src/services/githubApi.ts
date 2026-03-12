import type {
  CmsConfigDocument,
  CmsConfigFile,
  PreviewSessionResponse,
  PreviewSnapshotResponse,
  RepoSummary,
  SessionResponse,
  TreeEntry,
} from "../types/cms";

async function request<T>(url: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(url, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    let parsedMessage = "";

    try {
      const parsed = JSON.parse(errorText) as { message?: string };
      parsedMessage = parsed.message ?? "";
    } catch {}

    throw new Error(parsedMessage || errorText || `Request failed with status ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export function getSession(): Promise<SessionResponse> {
  return request<SessionResponse>("/api/session");
}

export function logout(): Promise<void> {
  return request<void>("/auth/logout", { method: "POST" });
}

export async function getRepos(): Promise<RepoSummary[]> {
  const response = await request<{ repos: RepoSummary[] }>("/api/repos");
  return response.repos;
}

export async function getTree(
  owner: string,
  repo: string,
  treePath = "",
): Promise<TreeEntry[]> {
  const params = new URLSearchParams({ owner, repo });

  if (treePath) {
    params.set("path", treePath);
  }

  const response = await request<{ entries: TreeEntry[] }>(`/api/tree?${params.toString()}`);
  return response.entries;
}

export async function getCmsConfigs(
  owner: string,
  repo: string,
  folder: string,
): Promise<CmsConfigFile[]> {
  const params = new URLSearchParams({ owner, repo, folder });
  const response = await request<{ files: CmsConfigFile[] }>(`/api/cms-configs?${params.toString()}`);
  return response.files;
}

export function saveCmsFile(options: {
  owner: string;
  repo: string;
  path: string;
  content: CmsConfigDocument;
  message?: string;
}): Promise<unknown> {
  return request<unknown>("/api/cms-config-file", {
    method: "PUT",
    body: JSON.stringify(options),
  });
}

export function createPreviewSession(options: {
  owner: string;
  repo: string;
}): Promise<PreviewSessionResponse> {
  return request<PreviewSessionResponse>("/api/preview/sessions", {
    method: "POST",
    body: JSON.stringify(options),
  });
}

export function updatePreviewFile(options: {
  sessionId: string;
  path: string;
  content: CmsConfigDocument;
}): Promise<unknown> {
  return request<unknown>(`/api/preview/sessions/${encodeURIComponent(options.sessionId)}/file`, {
    method: "PUT",
    body: JSON.stringify({
      path: options.path,
      content: options.content,
    }),
  });
}

export function getPreviewSnapshot(sessionId: string): Promise<PreviewSnapshotResponse> {
  return request<PreviewSnapshotResponse>(
    `/api/preview/sessions/${encodeURIComponent(sessionId)}/snapshot`,
  );
}

export function deletePreviewSession(sessionId: string): Promise<void> {
  return request<void>(`/api/preview/sessions/${encodeURIComponent(sessionId)}`, {
    method: "DELETE",
  });
}
