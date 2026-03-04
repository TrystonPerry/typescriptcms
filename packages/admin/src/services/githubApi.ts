import type {
  CmsConfigDocument,
  CmsConfigFile,
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
    throw new Error(errorText || `Request failed with status ${response.status}`);
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
