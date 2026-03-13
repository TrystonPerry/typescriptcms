export interface GitHubUser {
  login: string;
  name: string;
  avatarUrl: string;
  profileUrl: string;
}

export interface SessionResponse {
  authenticated: boolean;
  local?: boolean;
  user?: GitHubUser;
}

export interface RepoSummary {
  id: number;
  name: string;
  fullName: string;
  private: boolean;
  owner: string;
  defaultBranch: string;
  pushedAt: string;
}

export interface TreeEntry {
  name: string;
  path: string;
  type: "dir" | "file";
  sha: string;
  size: number;
}

export interface CmsFieldBase {
  type: string;
  title?: string;
  description?: string;
  default?: unknown;
  value?: unknown;
}

export interface CmsStringField extends CmsFieldBase {
  type: "string";
  minLength?: number;
  maxLength?: number;
  pattern?: string;
}

export interface CmsEnumField extends CmsFieldBase {
  type: "enum";
  enum: string[];
}

export type CmsField = CmsStringField | CmsEnumField | CmsFieldBase;
export type CmsConfigDocument = Record<string, CmsField>;

export interface CmsConfigFile {
  path: string;
  config: CmsConfigDocument | null;
  parseError?: string;
}

export interface PageSeo {
  title: string;
  description: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  [key: string]: unknown;
}

export interface PageSection {
  component: string;
  props: Record<string, unknown>;
}

export interface PageData {
  seo: PageSeo;
  sections: PageSection[];
}

export interface PageFile {
  path: string;
  page: PageData | null;
  parseError?: string;
}

export interface PreviewSessionResponse {
  sessionId: string;
  owner: string;
  repo: string;
  createdAt: string;
  expiresAt: string;
}

export interface PreviewSnapshotFile {
  path: string;
  content: CmsConfigDocument;
}

export interface PreviewSnapshotResponse {
  sessionId: string;
  owner: string;
  repo: string;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  files: PreviewSnapshotFile[];
}
