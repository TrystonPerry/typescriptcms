<script setup lang="ts">
import type { CtaSectionProps } from "../cms/components";

defineProps<CtaSectionProps>();
</script>

<template>
  <section class="cta">
    <img v-if="decorativeImage" :src="decorativeImage" alt="" class="cta-decor" />
    <h2>{{ title }}</h2>
    <p v-if="subtitle">{{ subtitle }}</p>
  </section>
</template>
