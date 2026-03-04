<template>
  <section class="panel repo-card">
    <p class="panel-title">Repository</p>

    <p v-if="!repos.length" class="empty-state">
      No repositories yet. Log in and refresh to load repos.
    </p>

    <select
      v-else
      class="field-select"
      :value="selectedFullName"
      @change="onSelect"
    >
      <option value="">Select a repository</option>
      <option v-for="repo in repos" :key="repo.id" :value="repo.fullName">
        {{ repo.fullName }}
      </option>
    </select>
  </section>
</template>

<script lang="ts">
import { defineComponent, type PropType } from "vue";

import type { RepoSummary } from "../types/cms";

export default defineComponent({
  name: "RepoSelect",
  props: {
    repos: {
      type: Array as PropType<RepoSummary[]>,
      required: true,
    },
    selectedFullName: {
      type: String,
      default: "",
    },
  },
  emits: ["select"],
  methods: {
    onSelect(event: Event) {
      const target = event.target as HTMLSelectElement;
      const chosen = this.repos.find((repo) => repo.fullName === target.value) ?? null;
      this.$emit("select", chosen);
    },
  },
});
</script>

<style scoped>
.repo-card {
  padding: 1rem;
}

.empty-state {
  color: var(--subtle);
  margin-top: 0.8rem;
}
</style>
