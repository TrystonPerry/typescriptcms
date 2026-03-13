<template>
  <main class="page-shell admin-page">
    <header class="admin-header panel">
      <div>
        <p class="eyebrow">Admin</p>
        <h1>{{ localMode ? "CMS Editor" : "GitHub CMS Editor" }}</h1>
        <p class="subtle" v-if="localMode">
          Editing CMS content from the local filesystem.
        </p>
        <p class="subtle" v-else>
          Login, pick a repo, choose the CMS folder, and edit content.
        </p>
      </div>
      <router-link class="btn btn-ghost" to="/">Back Home</router-link>
    </header>

    <p v-if="errorMessage" class="status-error">{{ errorMessage }}</p>

    <section class="app-row">
      <aside class="editor-column">
        <template v-if="!localMode">
          <div class="editor-controls">
            <GitHubAuthCard
              :session="session"
              :loading="checkingSession"
              @login="startLogin"
              @logout="disconnect"
            />

            <RepoSelect
              :repos="repos"
              :selected-full-name="selectedRepo?.fullName || ''"
              @select="onRepoSelect"
            />
          </div>

          <FileTreeExplorer
            :owner="selectedRepo?.owner || ''"
            :repo="selectedRepo?.name || ''"
            :selected-path="selectedFolder"
            @folder-selected="onFolderSelect"
          />
        </template>

        <PageEditor
          v-if="pageFiles.length"
          :owner="selectedRepo?.owner || ''"
          :repo="selectedRepo?.name || ''"
          :local-mode="localMode"
          :files="pageFiles"
          :schemas="componentSchemas"
          :status-message="pageSaveMessage"
          @save-page="savePageHandler"
          @preview-change="onPagePreviewChange"
        />

        <CmsConfigEditor
          v-if="cmsFiles.length"
          :owner="selectedRepo?.owner || ''"
          :repo="selectedRepo?.name || ''"
          :local-mode="localMode"
          :files="cmsFiles"
          :status-message="saveMessage"
          @save-file="saveFile"
          @preview-change="onPreviewChange"
        />
      </aside>

      <section class="panel preview-panel">
        <div class="preview-head">
          <div>
            <p class="panel-title">Live Preview</p>
          </div>
          <p class="status-ok" v-if="previewStatus">{{ previewStatus }}</p>
        </div>

        <div class="preview-frame-wrap">
          <iframe
            class="preview-frame"
            :src="previewUrl"
            title="Site preview"
            @load="onPreviewFrameLoad"
          />
        </div>
      </section>
    </section>
  </main>
</template>

<script lang="ts">
import { defineComponent } from "vue";

import CmsConfigEditor from "../components/CmsConfigEditor.vue";
import FileTreeExplorer from "../components/FileTreeExplorer.vue";
import GitHubAuthCard from "../components/GitHubAuthCard.vue";
import PageEditor from "../components/PageEditor.vue";
import RepoSelect from "../components/RepoSelect.vue";
import {
  getCmsConfigs,
  getComponentSchemas,
  getLocalCmsConfigs,
  getPageFiles,
  getRepos,
  getSession,
  logout,
  saveCmsFile,
  savePageFile,
} from "../services/githubApi";
import type {
  CmsConfigDocument,
  CmsConfigFile,
  CmsField,
  PageData,
  PageFile,
  RepoSummary,
  SessionResponse,
} from "../types/cms";

const PREVIEW_MSG_TYPE = "typescriptcms:preview-update";

interface SavePayload {
  owner: string;
  repo: string;
  path: string;
  content: CmsConfigDocument;
}

interface PreviewChangePayload {
  path: string;
  content: CmsConfigDocument;
}

interface PageSavePayload {
  owner: string;
  repo: string;
  path: string;
  page: PageData;
}

interface PagePreviewPayload {
  path: string;
  page: PageData;
}

const previewUrl =
  import.meta.env.VITE_EXAMPLE_PREVIEW_URL ?? "http://localhost:5173";

function extractFieldValues(content: CmsConfigDocument): Record<string, unknown> {
  const fields: Record<string, unknown> = {};

  for (const [key, field] of Object.entries(content)) {
    if ((field as CmsField).value !== undefined) {
      fields[key] = (field as CmsField).value;
    }
  }

  return fields;
}

export default defineComponent({
  name: "AdminPage",
  components: {
    GitHubAuthCard,
    RepoSelect,
    FileTreeExplorer,
    CmsConfigEditor,
    PageEditor,
  },
  data() {
    return {
      localMode: false,
      checkingSession: true,
      session: null as SessionResponse | null,
      repos: [] as RepoSummary[],
      selectedRepo: null as RepoSummary | null,
      selectedFolder: "",
      cmsFiles: [] as CmsConfigFile[],
      pageFiles: [] as PageFile[],
      componentSchemas: {} as Record<string, CmsConfigDocument>,
      errorMessage: "",
      saveMessage: "",
      pageSaveMessage: "",
      previewStatus: "",
      previewUrl,
    };
  },
  async created() {
    await this.initialize();
  },
  methods: {
    async initialize() {
      this.checkingSession = true;
      this.errorMessage = "";

      try {
        this.session = await getSession();
        this.localMode = this.session.local === true;

        if (this.localMode) {
          const [configs, schemas, pages] = await Promise.all([
            getLocalCmsConfigs(),
            getComponentSchemas(),
            getPageFiles(),
          ]);
          this.cmsFiles = configs.filter(
            (f) => !f.path.startsWith("components/"),
          );
          this.componentSchemas = schemas;
          this.pageFiles = pages;
        } else if (this.session.authenticated) {
          this.repos = await getRepos();
        }
      } catch (error) {
        this.errorMessage = (error as Error).message;
      } finally {
        this.checkingSession = false;
      }
    },
    startLogin() {
      window.location.assign("/admin/auth/github");
    },
    getIframe(): HTMLIFrameElement | null {
      return this.$el?.querySelector?.(
        "iframe.preview-frame",
      ) as HTMLIFrameElement | null;
    },
    postToPreview(configPath: string, content: CmsConfigDocument) {
      const iframe = this.getIframe();
      if (!iframe?.contentWindow) return;

      iframe.contentWindow.postMessage(
        {
          type: PREVIEW_MSG_TYPE,
          configPath,
          fields: extractFieldValues(content),
        },
        "*",
      );
    },
    postPageToPreview(pagePath: string, page: PageData) {
      const iframe = this.getIframe();
      if (!iframe?.contentWindow) return;

      iframe.contentWindow.postMessage(
        {
          type: PREVIEW_MSG_TYPE,
          configPath: pagePath,
          fields: page,
        },
        "*",
      );
    },
    onPreviewFrameLoad() {
      for (const file of this.cmsFiles) {
        if (file.config) {
          this.postToPreview(file.path, file.config);
        }
      }
      for (const file of this.pageFiles) {
        if (file.page) {
          this.postPageToPreview(file.path, file.page);
        }
      }
    },
    onPreviewChange(payload: PreviewChangePayload) {
      this.postToPreview(payload.path, payload.content);
      this.previewStatus = `Preview updated ${new Date().toLocaleTimeString()}`;
    },
    onPagePreviewChange(payload: PagePreviewPayload) {
      this.postPageToPreview(payload.path, payload.page);
      this.previewStatus = `Preview updated ${new Date().toLocaleTimeString()}`;
    },
    async disconnect() {
      await logout();
      this.session = { authenticated: false };
      this.repos = [];
      this.selectedRepo = null;
      this.selectedFolder = "";
      this.cmsFiles = [];
      this.pageFiles = [];
      this.componentSchemas = {};
      this.saveMessage = "";
      this.pageSaveMessage = "";
      this.errorMessage = "";
    },
    async onRepoSelect(repo: RepoSummary | null) {
      this.selectedRepo = repo;
      this.selectedFolder = "";
      this.cmsFiles = [];
      this.pageFiles = [];
      this.componentSchemas = {};
      this.saveMessage = "";
      this.pageSaveMessage = "";
      this.errorMessage = "";
    },
    async onFolderSelect(folderPath: string) {
      this.selectedFolder = folderPath;
      this.saveMessage = "";
      this.pageSaveMessage = "";
      this.errorMessage = "";

      if (!this.selectedRepo) return;

      const owner = this.selectedRepo.owner;
      const repo = this.selectedRepo.name;

      try {
        const [configs, schemas, pages] = await Promise.all([
          getCmsConfigs(owner, repo, folderPath),
          getComponentSchemas(owner, repo, folderPath),
          getPageFiles(owner, repo, folderPath),
        ]);
        this.cmsFiles = configs.filter(
          (f) => !f.path.includes("components/"),
        );
        this.componentSchemas = schemas;
        this.pageFiles = pages;
      } catch (error) {
        this.errorMessage = (error as Error).message;
      }
    },
    async saveFile(
      payload: SavePayload,
      onSuccess: () => void,
      onFailure: () => void,
    ) {
      this.errorMessage = "";

      try {
        await saveCmsFile({
          owner: this.localMode ? undefined : payload.owner,
          repo: this.localMode ? undefined : payload.repo,
          path: payload.path,
          content: payload.content,
          message: this.localMode
            ? undefined
            : `Update ${payload.path} from TypeScript CMS admin`,
        });
        this.saveMessage = `Saved ${payload.path}`;
        onSuccess();
      } catch (error) {
        this.errorMessage = (error as Error).message;
        onFailure();
      }
    },
    async savePageHandler(
      payload: PageSavePayload,
      onSuccess: () => void,
      onFailure: () => void,
    ) {
      this.errorMessage = "";

      try {
        await savePageFile({
          owner: this.localMode ? undefined : payload.owner,
          repo: this.localMode ? undefined : payload.repo,
          path: payload.path,
          page: payload.page,
          message: this.localMode
            ? undefined
            : `Update ${payload.path} from TypeScript CMS admin`,
        });
        this.pageSaveMessage = `Saved ${payload.path}`;
        onSuccess();
      } catch (error) {
        this.errorMessage = (error as Error).message;
        onFailure();
      }
    },
  },
});
</script>

<style scoped>
.admin-page {
  display: grid;
  gap: 1rem;
  max-width: none;
  width: 100%;
}

.admin-header {
  padding: 1.25rem;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.admin-header h1 {
  margin: 0.35rem 0 0.45rem;
  font-size: clamp(1.7rem, 4vw, 2.5rem);
}

.eyebrow {
  margin: 0;
  font-size: 0.85rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #9d5f2b;
  font-weight: 700;
}

.subtle {
  color: var(--subtle);
  margin: 0;
}

.app-row {
  display: grid;
  grid-template-columns: minmax(360px, 460px) minmax(0, 1fr);
  align-items: start;
  gap: 1rem;
}

.editor-column {
  display: grid;
  gap: 1rem;
}

.preview-panel {
  padding: 1rem;
}

.preview-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.preview-frame-wrap {
  border: 1px solid var(--border);
  border-radius: 12px;
  overflow: hidden;
  background: #fff;
}

.preview-frame {
  width: 100%;
  min-height: 900px;
  border: 0;
  background: #fff;
}

.editor-controls {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

@media (max-width: 1200px) {
  .editor-controls {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 760px) {
  .admin-header {
    flex-direction: column;
  }
}
</style>
