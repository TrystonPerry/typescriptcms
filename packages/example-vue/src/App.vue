<script setup lang="ts">
import { useCmsContent } from "./cms";

const home = useCmsContent("home");
</script>

<template>
  <main class="canvas">
    <article class="card" :style="{ background: String(home.cardColor) }">
      <h1>{{ String(home.title) }}</h1>
      <p>{{ String(home.description) }}</p>
      <dl>
        <div>
          <dt>Author</dt>
          <dd>{{ String(home.author) }}</dd>
        </div>
        <div>
          <dt>Version</dt>
          <dd>{{ String(home.version) }}</dd>
        </div>
        <div>
          <dt>License</dt>
          <dd>{{ String(home.license) }}</dd>
        </div>
      </dl>
    </article>
  </main>
</template>
