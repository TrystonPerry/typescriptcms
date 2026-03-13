<template>
  <main class="page-shell editor-page">
    <header class="editor-header panel">
      <router-link class="back-link" to="/editor">&larr; Back</router-link>
      <h1>Edit {{ friendlyName }}</h1>
    </header>

    <p v-if="!configFile" class="status-error">
      We could not load this item yet.
      <router-link to="/editor">Go back</router-link>
    </p>

    <p v-if="store.errorMessage" class="status-error">
      {{ store.errorMessage }}
    </p>

    <CmsConfigEditor
      v-if="configFile"
      :owner="store.selectedRepo?.owner || ''"
      :repo="store.selectedRepo?.name || ''"
      :local-mode="store.localMode"
      :files="[configFile]"
      :status-message="saveMessage"
      @save-file="saveFile"
    />
  </main>
</template>

<script lang="ts">
import { defineComponent } from "vue";

import CmsConfigEditor from "../components/CmsConfigEditor.vue";
import { saveCmsFile } from "../services/githubApi";
import { cmsStore, initialize } from "../stores/cms";
import type { CmsConfigDocument, CmsConfigFile } from "../types/cms";

interface SavePayload {
  owner: string;
  repo: string;
  path: string;
  content: CmsConfigDocument;
}

export default defineComponent({
  name: "ConfigEditorPage",
  components: { CmsConfigEditor },
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
    configFile(): CmsConfigFile | undefined {
      return cmsStore.cmsFiles.find((f) => f.path === this.filePath);
    },
    friendlyName(): string {
      let name = this.filePath.split("/").pop() || this.filePath;
      name = name.replace(/\.config\.json$/, "");
      return name
        .replace(/[-_]/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
    },
  },
  async created() {
    await initialize();
  },
  methods: {
    async saveFile(
      payload: SavePayload,
      onSuccess: () => void,
      onFailure: () => void
    ) {
      cmsStore.errorMessage = "";

      try {
        await saveCmsFile({
          owner: cmsStore.localMode ? undefined : payload.owner,
          repo: cmsStore.localMode ? undefined : payload.repo,
          path: payload.path,
          content: payload.content,
          message: cmsStore.localMode
            ? undefined
            : `Update ${payload.path} from TypeScript CMS admin`,
        });
        this.saveMessage = "Saved changes";
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
  display: grid;
  gap: 0.5rem;
}

.editor-header h1 {
  margin: 0;
  font-size: clamp(1.3rem, 2.5vw, 1.8rem);
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
  font-size: 0.9rem;
}
</style>
