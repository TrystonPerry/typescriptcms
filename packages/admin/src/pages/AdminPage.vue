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

    <section class="top-grid">
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
    </section>

    <p v-if="errorMessage" class="status-error">{{ errorMessage }}</p>

    <section class="editor-grid">
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
      />
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
  getCmsConfigs,
  getRepos,
  getSession,
  logout,
  saveCmsFile,
} from "../services/githubApi";
import type { CmsConfigFile, RepoSummary, SessionResponse } from "../types/cms";

interface SavePayload {
  owner: string;
  repo: string;
  path: string;
  content: Record<string, unknown>;
}

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
    async disconnect() {
      await logout();
      this.session = { authenticated: false };
      this.repos = [];
      this.selectedRepo = null;
      this.selectedFolder = "";
      this.cmsFiles = [];
      this.saveMessage = "";
      this.errorMessage = "";
    },
    onRepoSelect(repo: RepoSummary | null) {
      this.selectedRepo = repo;
      this.selectedFolder = "";
      this.cmsFiles = [];
      this.saveMessage = "";
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

.top-grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: 1fr 1fr;
}

.editor-grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: 340px 1fr;
}

@media (max-width: 1100px) {
  .editor-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 760px) {
  .top-grid {
    grid-template-columns: 1fr;
  }

  .admin-header {
    flex-direction: column;
  }
}
</style>
