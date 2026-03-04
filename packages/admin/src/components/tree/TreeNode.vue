<template>
  <div class="tree-row-wrapper">
    <button
      class="tree-row"
      :class="{
        selected: node.path === selectedPath,
        directory: node.type === 'dir'
      }"
      type="button"
      :style="{ paddingLeft: `${Math.max(level, 0) * 14 + 8}px` }"
      @click="handleClick"
    >
      <span class="caret">
        <span v-if="node.type === 'dir'">{{ node.expanded ? '▾' : '▸' }}</span>
      </span>
      <span class="icon">{{ node.type === "dir" ? "📁" : "📄" }}</span>
      <span class="name">{{ node.name }}</span>
    </button>

    <div v-if="node.type === 'dir' && node.expanded" class="tree-children">
      <TreeNode
        v-for="child in node.children"
        :key="child.path"
        :node="child"
        :level="level + 1"
        :selected-path="selectedPath"
        @toggle="$emit('toggle', $event)"
        @select="$emit('select', $event)"
      />
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, type PropType } from "vue";

export interface TreeNodeModel {
  name: string;
  path: string;
  type: "dir" | "file";
  expanded?: boolean;
  loading?: boolean;
  loaded?: boolean;
  children?: TreeNodeModel[];
}

export default defineComponent({
  name: "TreeNode",
  props: {
    node: {
      type: Object as PropType<TreeNodeModel>,
      required: true,
    },
    level: {
      type: Number,
      default: 0,
    },
    selectedPath: {
      type: String,
      default: "",
    },
  },
  emits: ["toggle", "select"],
  methods: {
    handleClick() {
      if (this.node.type === "dir") {
        this.$emit("toggle", this.node);
        this.$emit("select", this.node.path);
      }
    },
  },
});
</script>

<style scoped>
.tree-row {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  border: 0;
  background: transparent;
  padding-top: 0.35rem;
  padding-bottom: 0.35rem;
  text-align: left;
  color: var(--text);
  cursor: pointer;
}

.tree-row.selected {
  background: var(--accent-soft);
}

.caret {
  width: 1.1rem;
  color: var(--subtle);
}

.icon {
  width: 1.2rem;
}

.name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
