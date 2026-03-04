<template>
  <main class="page-shell admin-page">
    <header class="admin-header panel">
      <div>
        <p class="eyebrow">Admin</p>
        <h1>GitHub CMS Editor</h1>
        <p class="subtle">
          Login, pick a repo, choose the CMS folder, and edit `.config.json` definitions.
        </p>
      </div>
      <router-link class="btn btn-ghost" to="/">Back Home</router-link>
    </header>

    <p v-if="errorMessage" class="status-error">{{ errorMessage }}</p>

    <section class="workspace-grid">
      <aside class="workspace-sidebar">
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

        <FileTreeExplorer
          :owner="selectedRepo?.owner || ''"
          :repo="selectedRepo?.name || ''"
          :selected-path="selectedFolder"
          @folder-selected="onFolderSelect"
        />

        <CmsConfigEditor
          :owner="selectedRepo?.owner || ''"
          :repo="selectedRepo?.name || ''"
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
            <p class="subtle" v-if="previewSessionId">
              Session {{ previewSessionId }}
            </p>
          </div>
          <p class="status-ok" v-if="previewStatus">{{ previewStatus }}</p>
        </div>

        <p v-if="!selectedRepo" class="subtle">
          Select a repository to initialize preview mode.
        </p>

        <p v-else-if="!previewSessionId" class="subtle">
          Loading preview session...
        </p>

        <div v-else class="preview-frame-wrap">
          <iframe
            class="preview-frame"
            :src="previewFrameSrc"
            title="Site preview"
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
import RepoSelect from "../components/RepoSelect.vue";
import {
  createPreviewSession,
  deletePreviewSession,
  getCmsConfigs,
  getRepos,
  getSession,
  logout,
  saveCmsFile,
  updatePreviewFile,
} from "../services/githubApi";
import type {
  CmsConfigDocument,
  CmsConfigFile,
  RepoSummary,
  SessionResponse,
} from "../types/cms";

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

const defaultPreviewUrl =
  import.meta.env.VITE_EXAMPLE_PREVIEW_URL ?? "http://localhost:5175";

export default defineComponent({
  name: "AdminPage",
  components: {
    GitHubAuthCard,
    RepoSelect,
    FileTreeExplorer,
    CmsConfigEditor,
  },
  data() {
    return {
      checkingSession: true,
      session: null as SessionResponse | null,
      repos: [] as RepoSummary[],
      selectedRepo: null as RepoSummary | null,
      selectedFolder: "",
      cmsFiles: [] as CmsConfigFile[],
      errorMessage: "",
      saveMessage: "",
      previewSessionId: "",
      previewStatus: "",
      previewRevision: 0,
      previewSyncTimers: {} as Record<string, number>,
      previewSessionLoading: false,
    };
  },
  computed: {
    previewFrameSrc(): string {
      if (!this.previewSessionId) {
        return "";
      }

      const url = new URL(defaultPreviewUrl);
      url.searchParams.set("previewSession", this.previewSessionId);
      url.searchParams.set("previewRev", String(this.previewRevision));
      return url.toString();
    },
  },
  async created() {
    await this.initialize();
  },
  beforeUnmount() {
    this.clearPreviewSyncTimers();
  },
  methods: {
    async initialize() {
      this.checkingSession = true;
      this.errorMessage = "";

      try {
        this.session = await getSession();

        if (this.session.authenticated) {
          this.repos = await getRepos();
        }
      } catch (error) {
        this.errorMessage = (error as Error).message;
      } finally {
        this.checkingSession = false;
      }
    },
    startLogin() {
      window.location.assign("/auth/github");
    },
    clearPreviewSyncTimers() {
      for (const timerId of Object.values(this.previewSyncTimers)) {
        window.clearTimeout(timerId);
      }

      this.previewSyncTimers = {};
    },
    async closePreviewSession() {
      const previousSessionId = this.previewSessionId;

      this.previewSessionId = "";
      this.previewStatus = "";
      this.previewRevision = 0;
      this.previewSessionLoading = false;
      this.clearPreviewSyncTimers();

      if (!previousSessionId) {
        return;
      }

      try {
        await deletePreviewSession(previousSessionId);
      } catch {
        // Non-fatal cleanup failure.
      }
    },
    async openPreviewSession(owner: string, repo: string) {
      this.previewSessionLoading = true;

      try {
        const previewSession = await createPreviewSession({ owner, repo });
        this.previewSessionId = previewSession.sessionId;
        this.previewStatus = "Preview session active";
        this.previewRevision += 1;
      } finally {
        this.previewSessionLoading = false;
      }
    },
    async ensurePreviewSession(): Promise<boolean> {
      if (this.previewSessionId) {
        return true;
      }

      if (!this.selectedRepo || this.previewSessionLoading) {
        return false;
      }

      try {
        await this.openPreviewSession(this.selectedRepo.owner, this.selectedRepo.name);
        return Boolean(this.previewSessionId);
      } catch (error) {
        this.errorMessage = (error as Error).message;
        return false;
      }
    },
    async disconnect() {
      await logout();
      await this.closePreviewSession();
      this.session = { authenticated: false };
      this.repos = [];
      this.selectedRepo = null;
      this.selectedFolder = "";
      this.cmsFiles = [];
      this.saveMessage = "";
      this.errorMessage = "";
    },
    async onRepoSelect(repo: RepoSummary | null) {
      this.selectedRepo = repo;
      this.selectedFolder = "";
      this.cmsFiles = [];
      this.saveMessage = "";
      this.errorMessage = "";
      await this.closePreviewSession();

      if (!repo || !this.session?.authenticated) {
        return;
      }

      try {
        await this.openPreviewSession(repo.owner, repo.name);
      } catch (error) {
        this.errorMessage = (error as Error).message;
      }
    },
    async onFolderSelect(path: string) {
      this.selectedFolder = path;
      this.saveMessage = "";
      this.errorMessage = "";

      if (!this.selectedRepo) {
        return;
      }

      try {
        this.cmsFiles = await getCmsConfigs(
          this.selectedRepo.owner,
          this.selectedRepo.name,
          path,
        );

        for (const file of this.cmsFiles) {
          if (!file.config) {
            continue;
          }

          void this.queuePreviewSync(
            {
              path: file.path,
              content: file.config,
            },
            false,
          );
        }
      } catch (error) {
        this.errorMessage = (error as Error).message;
      }
    },
    async queuePreviewSync(payload: PreviewChangePayload, debounce = true) {
      const hasSession = await this.ensurePreviewSession();

      if (!hasSession || !this.previewSessionId) {
        return;
      }

      const draft = {
        path: payload.path,
        content: JSON.parse(JSON.stringify(payload.content)) as CmsConfigDocument,
      };

      const runSync = async () => {
        try {
          await updatePreviewFile({
            sessionId: this.previewSessionId,
            path: draft.path,
            content: draft.content,
          });
          this.previewRevision += 1;
          this.previewStatus = `Preview updated ${new Date().toLocaleTimeString()}`;
        } catch (error) {
          this.errorMessage = (error as Error).message;
        }
      };

      if (!debounce) {
        await runSync();
        return;
      }

      if (this.previewSyncTimers[draft.path]) {
        window.clearTimeout(this.previewSyncTimers[draft.path]);
      }

      this.previewSyncTimers[draft.path] = window.setTimeout(() => {
        void runSync();
      }, 250);
    },
    onPreviewChange(payload: PreviewChangePayload) {
      void this.queuePreviewSync(payload);
    },
    async saveFile(
      payload: SavePayload,
      onSuccess: () => void,
      onFailure: () => void,
    ) {
      this.errorMessage = "";

      try {
        await saveCmsFile({
          owner: payload.owner,
          repo: payload.repo,
          path: payload.path,
          content: payload.content,
          message: `Update ${payload.path} from TypeScript CMS admin`,
        });
        this.saveMessage = `Saved ${payload.path}`;
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

.workspace-grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: minmax(360px, 460px) 1fr;
  align-items: start;
}

.workspace-sidebar {
  display: grid;
  gap: 1rem;
}

.preview-panel {
  padding: 1rem;
  min-height: 100%;
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

@media (max-width: 1100px) {
  .workspace-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 760px) {
  .admin-header {
    flex-direction: column;
  }
}
</style>
