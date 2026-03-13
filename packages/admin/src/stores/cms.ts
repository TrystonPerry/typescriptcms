import { reactive } from "vue";

import {
  getCmsConfigs,
  getComponentSchemas,
  getLocalCmsConfigs,
  getPageFiles,
  getRepos,
  getSession,
  logout,
} from "../services/githubApi";
import type {
  CmsConfigDocument,
  CmsConfigFile,
  PageFile,
  RepoSummary,
  SessionResponse,
} from "../types/cms";

export interface CmsStore {
  localMode: boolean;
  initialized: boolean;
  loading: boolean;
  session: SessionResponse | null;
  repos: RepoSummary[];
  selectedRepo: RepoSummary | null;
  selectedFolder: string;
  cmsFiles: CmsConfigFile[];
  pageFiles: PageFile[];
  componentSchemas: Record<string, CmsConfigDocument>;
  errorMessage: string;
}

export const cmsStore = reactive<CmsStore>({
  localMode: false,
  initialized: false,
  loading: false,
  session: null,
  repos: [],
  selectedRepo: null,
  selectedFolder: "",
  cmsFiles: [],
  pageFiles: [],
  componentSchemas: {},
  errorMessage: "",
});

export async function initialize() {
  if (cmsStore.initialized) return;

  cmsStore.loading = true;
  cmsStore.errorMessage = "";

  try {
    cmsStore.session = await getSession();
    cmsStore.localMode = cmsStore.session.local === true;

    if (cmsStore.localMode) {
      await fetchLocalData();
    } else if (cmsStore.session.authenticated) {
      cmsStore.repos = await getRepos();
    }

    cmsStore.initialized = true;
  } catch (error) {
    cmsStore.errorMessage = (error as Error).message;
  } finally {
    cmsStore.loading = false;
  }
}

async function fetchLocalData() {
  const [configs, schemas, pages] = await Promise.all([
    getLocalCmsConfigs(),
    getComponentSchemas(),
    getPageFiles(),
  ]);

  cmsStore.cmsFiles = configs.filter(
    (f) => !f.path.startsWith("components/"),
  );
  cmsStore.componentSchemas = schemas;
  cmsStore.pageFiles = pages;
}

export function selectRepo(repo: RepoSummary | null) {
  cmsStore.selectedRepo = repo;
  cmsStore.selectedFolder = "";
  cmsStore.cmsFiles = [];
  cmsStore.pageFiles = [];
  cmsStore.componentSchemas = {};
  cmsStore.errorMessage = "";
}

export async function selectFolder(folderPath: string) {
  if (!cmsStore.selectedRepo) return;

  cmsStore.selectedFolder = folderPath;
  cmsStore.errorMessage = "";
  cmsStore.loading = true;

  const owner = cmsStore.selectedRepo.owner;
  const repo = cmsStore.selectedRepo.name;

  try {
    const [configs, schemas, pages] = await Promise.all([
      getCmsConfigs(owner, repo, folderPath),
      getComponentSchemas(owner, repo, folderPath),
      getPageFiles(owner, repo, folderPath),
    ]);

    cmsStore.cmsFiles = configs.filter(
      (f) => !f.path.includes("components/"),
    );
    cmsStore.componentSchemas = schemas;
    cmsStore.pageFiles = pages;
  } catch (error) {
    cmsStore.errorMessage = (error as Error).message;
  } finally {
    cmsStore.loading = false;
  }
}

export async function disconnectSession() {
  await logout();
  cmsStore.session = { authenticated: false };
  cmsStore.repos = [];
  cmsStore.selectedRepo = null;
  cmsStore.selectedFolder = "";
  cmsStore.cmsFiles = [];
  cmsStore.pageFiles = [];
  cmsStore.componentSchemas = {};
  cmsStore.errorMessage = "";
  cmsStore.initialized = false;
}

export function startLogin() {
  window.location.assign("/admin/auth/github");
}
