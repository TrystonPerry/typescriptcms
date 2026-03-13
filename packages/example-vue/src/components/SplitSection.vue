<script setup lang="ts">
import type { SplitSectionProps } from "../cms/components";

defineProps<SplitSectionProps>();
</script>

<template>
  <section :class="['split', `split--${imagePosition}`]">
    <img :src="imageSrc" :alt="imageAlt" class="split-image" />
    <div class="split-body">
      <h2>{{ title }}</h2>
      <p>{{ text }}</p>
    </div>
  </section>
</template>
