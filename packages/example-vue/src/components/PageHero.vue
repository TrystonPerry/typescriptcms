<script setup lang="ts">
import type { PageHeroProps } from "../cms/components";

defineProps<PageHeroProps>();
</script>

<template>
  <section
    class="hero"
    :style="{ backgroundImage: backgroundImage ? `url(${backgroundImage})` : undefined }"
  >
    <div class="hero-content">
      <h1>{{ title }}</h1>
      <a v-if="ctaText" :href="ctaTo" class="cta-button">{{ ctaText }}</a>
    </div>
  </section>
</template>
