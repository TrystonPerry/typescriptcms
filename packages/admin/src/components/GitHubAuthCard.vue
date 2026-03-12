<template>
  <section class="panel auth-card">
    <p class="panel-title">GitHub Access</p>

    <div v-if="session?.authenticated" class="auth-details">
      <img
        :src="session.user?.avatarUrl"
        alt="GitHub avatar"
        class="avatar"
      />
      <div>
        <p class="identity-name">{{ session.user?.name }}</p>
        <p class="identity-handle monospace">@{{ session.user?.login }}</p>
      </div>
      <button class="btn btn-ghost" type="button" @click="$emit('logout')">
        Disconnect
      </button>
    </div>

    <div v-else class="auth-empty">
      <p>Sign in with GitHub to view repositories and browse CMS folders.</p>
      <button class="btn btn-primary" type="button" :disabled="loading" @click="$emit('login')">
        {{ loading ? "Checking..." : "Log in with GitHub" }}
      </button>
    </div>
  </section>
</template>

<script lang="ts">
import { defineComponent, type PropType } from "vue";

import type { SessionResponse } from "../types/cms";

export default defineComponent({
  name: "GitHubAuthCard",
  props: {
    session: {
      type: Object as PropType<SessionResponse | null>,
      default: null,
    },
    loading: {
      type: Boolean,
      default: false,
    },
  },
  emits: ["login", "logout"],
});
</script>

<style scoped>
.auth-card {
  padding: 1rem;
}

.auth-empty p {
  margin-top: 0.6rem;
  margin-bottom: 0.9rem;
  color: var(--subtle);
}

.auth-details {
  margin-top: 0.85rem;
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 0.75rem;
  align-items: center;
}

.avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 2px solid var(--border);
}

.identity-name,
.identity-handle {
  margin: 0;
}

.identity-handle {
  color: var(--subtle);
}
</style>
