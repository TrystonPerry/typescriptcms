<template>
  <section class="panel tree-panel">
    <p class="panel-title">CMS Folder Explorer</p>
    <p class="monospace repo-label" v-if="owner && repo">{{ owner }}/{{ repo }}</p>

    <p v-if="!owner || !repo" class="empty-hint">
      Choose a repository to browse folders.
    </p>

    <p v-else-if="loading" class="empty-hint">Loading files...</p>

    <p v-else-if="error" class="status-error">{{ error }}</p>

    <div v-else class="tree-scroll">
      <button
        class="root-button"
        :class="{ selected: selectedPath === '' }"
        type="button"
        @click="onSelectFolder('')"
      >
        📦 Repository root
      </button>

      <TreeNode
        v-for="node in rootNodes"
        :key="node.path"
        :node="node"
        :selected-path="selectedPath"
        @toggle="toggleNode"
        @select="onSelectFolder"
      />
    </div>
  </section>
</template>

<script lang="ts">
import { defineComponent, type PropType } from "vue";

import { getTree } from "../services/githubApi";
import TreeNode, { type TreeNodeModel } from "./tree/TreeNode.vue";

export default defineComponent({
  name: "FileTreeExplorer",
  components: {
    TreeNode,
  },
  props: {
    owner: {
      type: String,
      default: "",
    },
    repo: {
      type: String,
      default: "",
    },
    selectedPath: {
      type: String,
      default: "",
    },
  },
  emits: ["folder-selected"],
  data() {
    return {
      loading: false,
      error: "",
      rootNodes: [] as TreeNodeModel[],
    };
  },
  watch: {
    owner() {
      void this.loadRoot();
    },
    repo() {
      void this.loadRoot();
    },
  },
  methods: {
    async loadRoot() {
      if (!this.owner || !this.repo) {
        this.rootNodes = [];
        return;
      }

      this.loading = true;
      this.error = "";

      try {
        const entries = await getTree(this.owner, this.repo);
        this.rootNodes = entries
          .filter((entry) => entry.type === "dir")
          .map((entry) => ({
            name: entry.name,
            path: entry.path,
            type: entry.type,
            expanded: false,
            loaded: false,
            loading: false,
            children: [],
          }));
      } catch (error) {
        this.error = (error as Error).message;
      } finally {
        this.loading = false;
      }
    },
    async toggleNode(node: TreeNodeModel) {
      if (node.type !== "dir") {
        return;
      }

      node.expanded = !node.expanded;

      if (!node.expanded || node.loaded || node.loading) {
        return;
      }

      node.loading = true;

      try {
        const entries = await getTree(this.owner, this.repo, node.path);
        node.children = entries
          .filter((entry) => entry.type === "dir")
          .map((entry) => ({
            name: entry.name,
            path: entry.path,
            type: entry.type,
            expanded: false,
            loaded: false,
            loading: false,
            children: [],
          }));

        node.loaded = true;
      } catch (error) {
        this.error = (error as Error).message;
      } finally {
        node.loading = false;
      }
    },
    onSelectFolder(path: string) {
      this.$emit("folder-selected", path);
    },
  },
});
</script>

<style scoped>
.tree-panel {
  padding: 1rem;
  min-height: 460px;
}

.repo-label {
  margin-top: 0.35rem;
  margin-bottom: 0.7rem;
  color: var(--subtle);
}

.tree-scroll {
  max-height: 530px;
  overflow: auto;
  margin-top: 0.4rem;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: #fff;
}

.root-button {
  width: 100%;
  border: 0;
  background: transparent;
  text-align: left;
  padding: 0.5rem 0.6rem;
  cursor: pointer;
  color: var(--text);
}

.root-button.selected {
  background: var(--accent-soft);
}

.empty-hint {
  margin-top: 0.75rem;
  color: var(--subtle);
}
</style>
