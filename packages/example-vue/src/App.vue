<script setup lang="ts">
import { ref, type Component } from "vue";
import { useCmsContent } from "./cms";
import { useCmsPage } from "./cms/pages";
import type { ComponentRegistry } from "./cms/components";
import PageHero from "./components/PageHero.vue";
import SplitSection from "./components/SplitSection.vue";
import CtaSection from "./components/CtaSection.vue";

const components: Record<keyof ComponentRegistry, Component> = {
  PageHero,
  SplitSection,
  CtaSection,
};

const view = ref<"home" | "about">("home");
const home = useCmsContent("home");
const page = useCmsPage("about");
</script>

<template>
  <nav class="nav">
    <button @click="view = 'home'" :data-active="view === 'home'">
      Home (useCmsContent)
    </button>
    <button @click="view = 'about'" :data-active="view === 'about'">
      About (useCmsPage)
    </button>
  </nav>

  <main v-if="view === 'home'" class="canvas">
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

  <main v-else>
    <component
      v-for="(section, i) in page.sections"
      :key="i"
      :is="components[section.component]"
      v-bind="section.props"
    />
  </main>
</template>
