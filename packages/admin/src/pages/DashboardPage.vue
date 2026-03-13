<template>
  <main class="page-shell dashboard-page">
    <header class="admin-header panel">
      <div>
        <p class="eyebrow">Admin</p>
        <h1>{{ store.localMode ? "CMS Editor" : "GitHub CMS Editor" }}</h1>
        <p class="subtle" v-if="store.localMode">
          Editing CMS content from the local filesystem.
        </p>
        <p class="subtle" v-else>
          Login, pick a repo, choose the CMS folder, and edit content.
        </p>
      </div>
      <router-link class="btn btn-ghost" to="/">Back Home</router-link>
    </header>

    <p v-if="store.errorMessage" class="status-error">{{ store.errorMessage }}</p>

    <template v-if="!store.localMode && store.initialized">
      <div class="editor-controls">
        <GitHubAuthCard
          :session="store.session"
          :loading="store.loading"
          @login="startLogin"
          @logout="disconnectSession"
        />

        <RepoSelect
          :repos="store.repos"
          :selected-full-name="store.selectedRepo?.fullName || ''"
          @select="selectRepo"
        />
      </div>

      <FileTreeExplorer
        v-if="store.selectedRepo"
        :owner="store.selectedRepo.owner"
        :repo="store.selectedRepo.name"
        :selected-path="store.selectedFolder"
        @folder-selected="selectFolder"
      />
    </template>

    <p v-if="store.loading && !store.initialized" class="subtle loading-text">
      Loading...
    </p>

    <template v-if="items.length">
      <p class="panel-title grid-title">Content</p>
      <div class="content-grid">
        <router-link
          v-for="item in items"
          :key="item.route"
          :to="item.route"
          class="content-card panel"
        >
          <span class="card-badge" :data-type="item.type">{{ item.type }}</span>
          <p class="card-name">{{ item.label }}</p>
          <p class="card-meta">{{ item.meta }}</p>
        </router-link>
      </div>
    </template>

    <p v-else-if="store.initialized && !store.loading && hasDataSource" class="subtle">
      No editable content found.
    </p>
  </main>
</template>

<script lang="ts">
import { defineComponent } from "vue";

import FileTreeExplorer from "../components/FileTreeExplorer.vue";
import GitHubAuthCard from "../components/GitHubAuthCard.vue";
import RepoSelect from "../components/RepoSelect.vue";
import {
  cmsStore,
  disconnectSession,
  initialize,
  selectFolder,
  selectRepo,
  startLogin,
} from "../stores/cms";

interface DashboardItem {
  label: string;
  type: "Page" | "Config";
  meta: string;
  route: string;
}

function toFriendlyName(filePath: string): string {
  let name = filePath.split("/").pop() || filePath;
  name = name.replace(/\.(page|config)\.json$/, "");
  return name
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default defineComponent({
  name: "DashboardPage",
  components: { GitHubAuthCard, RepoSelect, FileTreeExplorer },
  computed: {
    store() {
      return cmsStore;
    },
    hasDataSource(): boolean {
      return cmsStore.localMode || !!cmsStore.selectedFolder;
    },
    items(): DashboardItem[] {
      const result: DashboardItem[] = [];

      for (const pf of cmsStore.pageFiles) {
        const sectionCount = pf.page?.sections.length ?? 0;
        result.push({
          label: toFriendlyName(pf.path),
          type: "Page",
          meta: pf.parseError
            ? "Parse error"
            : `${sectionCount} section${sectionCount !== 1 ? "s" : ""}`,
          route: `/editor/page/${pf.path}`,
        });
      }

      for (const cf of cmsStore.cmsFiles) {
        const fieldCount = cf.config ? Object.keys(cf.config).length : 0;
        result.push({
          label: toFriendlyName(cf.path),
          type: "Config",
          meta: cf.parseError
            ? "Parse error"
            : `${fieldCount} field${fieldCount !== 1 ? "s" : ""}`,
          route: `/editor/config/${cf.path}`,
        });
      }

      return result;
    },
  },
  async created() {
    await initialize();
  },
  methods: {
    startLogin,
    disconnectSession,
    selectRepo,
    selectFolder,
  },
});
</script>

<style scoped>
.dashboard-page {
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

.loading-text {
  text-align: center;
  padding: 2rem 0;
}

.editor-controls {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.grid-title {
  margin-top: 0.5rem;
}

.content-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 0.75rem;
}

.content-card {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1.25rem;
  text-decoration: none;
  color: var(--text);
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.content-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 30px rgba(31, 36, 49, 0.14);
}

.card-badge {
  display: inline-block;
  width: fit-content;
  padding: 0.2rem 0.6rem;
  border-radius: 6px;
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.card-badge[data-type="Page"] {
  background: var(--accent-soft);
  color: var(--accent);
}

.card-badge[data-type="Config"] {
  background: #fef3e2;
  color: #9d5f2b;
}

.card-name {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 600;
}

.card-meta {
  margin: 0;
  font-size: 0.82rem;
  color: var(--subtle);
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
