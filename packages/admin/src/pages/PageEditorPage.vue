<template>
  <main class="page-shell editor-page">
    <header class="editor-header panel">
      <div>
        <router-link class="back-link" to="/editor">
          &larr; Back to Dashboard
        </router-link>
        <h1>{{ friendlyName }}</h1>
      </div>
    </header>

    <p v-if="!pageFile" class="status-error">
      Page file not found. It may not have been loaded yet.
      <router-link to="/editor">Return to dashboard</router-link>
    </p>

    <p v-if="store.errorMessage" class="status-error">
      {{ store.errorMessage }}
    </p>

    <section v-if="pageFile">
      <aside class="form-column">
        <PageEditor
          :owner="store.selectedRepo?.owner || ''"
          :repo="store.selectedRepo?.name || ''"
          :local-mode="store.localMode"
          :files="[pageFile]"
          :schemas="store.componentSchemas"
          :status-message="saveMessage"
          @save-page="savePageHandler"
        />
      </aside>
    </section>
  </main>
</template>

<script lang="ts">
import { defineComponent } from "vue";

import PageEditor from "../components/PageEditor.vue";
import { savePageFile } from "../services/githubApi";
import { cmsStore, initialize } from "../stores/cms";
import type { PageData, PageFile } from "../types/cms";

interface PageSavePayload {
  owner: string;
  repo: string;
  path: string;
  page: PageData;
}

export default defineComponent({
  name: "PageEditorPage",
  components: { PageEditor },
  data() {
    return {
      saveMessage: "",
    };
  },
  computed: {
    store() {
      return cmsStore;
    },
    filePath(): string {
      return this.$route.params.path as string;
    },
    pageFile(): PageFile | undefined {
      return cmsStore.pageFiles.find((f) => f.path === this.filePath);
    },
    friendlyName(): string {
      let name = this.filePath.split("/").pop() || this.filePath;
      name = name.replace(/\.page\.json$/, "");
      return name
        .replace(/[-_]/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
    },
  },
  async created() {
    await initialize();
  },
  methods: {
    async savePageHandler(
      payload: PageSavePayload,
      onSuccess: () => void,
      onFailure: () => void
    ) {
      cmsStore.errorMessage = "";

      try {
        await savePageFile({
          owner: cmsStore.localMode ? undefined : payload.owner,
          repo: cmsStore.localMode ? undefined : payload.repo,
          path: payload.path,
          page: payload.page,
          message: cmsStore.localMode
            ? undefined
            : `Update ${payload.path} from TypeScript CMS admin`,
        });
        this.saveMessage = `Saved ${payload.path}`;
        onSuccess();
      } catch (error) {
        cmsStore.errorMessage = (error as Error).message;
        onFailure();
      }
    },
  },
});
</script>

<style scoped>
.editor-page {
  display: grid;
  gap: 1rem;
  max-width: 820px;
  width: 100%;
}

.editor-header {
  padding: 1.25rem;
}

.editor-header h1 {
  margin: 0.35rem 0 0.25rem;
  font-size: clamp(1.4rem, 3vw, 2rem);
}

.back-link {
  font-size: 0.85rem;
  color: var(--accent);
  text-decoration: none;
  font-weight: 600;
}

.back-link:hover {
  text-decoration: underline;
}

.subtle {
  color: var(--subtle);
  margin: 0;
  font-size: 0.82rem;
}

.editor-row {
  align-items: start;
  gap: 1rem;
}
</style>
