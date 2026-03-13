<template>
  <section class="panel page-editor-panel">
    <div class="editor-head">
      <div>
        <p class="panel-title">Page Editor</p>
        <p class="subtle" v-if="localMode">Local filesystem</p>
        <p class="subtle" v-else-if="owner && repo">{{ owner }}/{{ repo }}</p>
      </div>
      <p class="status-ok" v-if="statusMessage">{{ statusMessage }}</p>
    </div>

    <p v-if="!pages.length" class="subtle">
      No <code>.page.json</code> files found.
    </p>

    <template v-else>
      <div class="page-tabs">
        <button
          v-for="p in pages"
          :key="p.path"
          class="page-tab"
          :data-active="p.path === activePath"
          @click="activePath = p.path"
        >
          {{ p.path }}
        </button>
      </div>

      <template v-if="activePage">
        <div class="page-toolbar">
          <button
            class="btn btn-primary"
            :disabled="!activePage.dirty || activePage.saving"
            @click="savePage"
          >
            {{ activePage.saving ? "Saving..." : activePage.dirty ? "Save" : "Saved" }}
          </button>
        </div>

        <p v-if="activePage.parseError" class="status-error">
          Could not parse: {{ activePage.parseError }}
        </p>

        <template v-else-if="activePage.page">
          <!-- SEO -->
          <details class="section-card" open>
            <summary class="section-summary">
              <span class="component-badge">SEO</span>
            </summary>
            <div class="field-grid">
              <div class="field-card" v-for="key in seoFields" :key="key">
                <label class="field-label" :for="`seo-${key}`">{{ key }}</label>
                <input
                  :id="`seo-${key}`"
                  class="field-input monospace"
                  type="text"
                  :value="activePage.page.seo[key] ?? ''"
                  @input="updateSeo(key, ($event.target as HTMLInputElement).value)"
                />
              </div>
            </div>
          </details>

          <!-- Sections -->
          <div class="sections-header">
            <p class="panel-title">Sections ({{ activePage.page.sections.length }})</p>
            <div class="add-section-wrap" v-if="componentNames.length">
              <select
                class="field-select add-select"
                v-model="addComponentName"
              >
                <option value="" disabled>Add section...</option>
                <option v-for="name in componentNames" :key="name" :value="name">
                  {{ name }}
                </option>
              </select>
              <button
                class="btn btn-ghost"
                :disabled="!addComponentName"
                @click="addSection"
              >
                + Add
              </button>
            </div>
          </div>

          <div
            v-for="(section, idx) in activePage.page.sections"
            :key="idx"
            class="section-card"
          >
            <div class="section-head">
              <span class="component-badge">{{ section.component }}</span>
              <div class="section-actions">
                <button
                  class="btn-icon"
                  title="Move up"
                  :disabled="idx === 0"
                  @click="moveSection(idx, -1)"
                >&#x25B2;</button>
                <button
                  class="btn-icon"
                  title="Move down"
                  :disabled="idx === activePage!.page!.sections.length - 1"
                  @click="moveSection(idx, 1)"
                >&#x25BC;</button>
                <button
                  class="btn-icon btn-danger"
                  title="Remove section"
                  @click="removeSection(idx)"
                >&#x2715;</button>
              </div>
            </div>

            <div class="field-grid" v-if="schemas[section.component]">
              <div
                class="field-card"
                v-for="fieldKey in Object.keys(schemas[section.component])"
                :key="`${idx}-${fieldKey}`"
              >
                <component
                  :is="inputComponentFor(schemas[section.component][fieldKey])"
                  v-if="inputComponentFor(schemas[section.component][fieldKey])"
                  :input-id="`section-${idx}-${fieldKey}`"
                  :label="schemas[section.component][fieldKey].title || fieldKey"
                  :field="schemas[section.component][fieldKey]"
                  :model-value="section.props[fieldKey] ?? ''"
                  @update:modelValue="updateSectionProp(idx, fieldKey, $event)"
                />
                <div v-else>
                  <label class="field-label">{{ fieldKey }}</label>
                  <input
                    class="field-input monospace"
                    type="text"
                    :value="String(section.props[fieldKey] ?? '')"
                    @input="updateSectionProp(idx, fieldKey, ($event.target as HTMLInputElement).value)"
                  />
                </div>
              </div>
            </div>

            <!-- Props not in schema -->
            <div class="field-grid" v-if="extraProps(section).length">
              <div
                class="field-card"
                v-for="key in extraProps(section)"
                :key="`${idx}-extra-${key}`"
              >
                <label class="field-label">{{ key }}</label>
                <textarea
                  class="field-input monospace json-field"
                  :value="JSON.stringify(section.props[key], null, 2)"
                  @change="updateSectionPropJson(idx, key, ($event.target as HTMLTextAreaElement).value)"
                />
              </div>
            </div>
          </div>
        </template>
      </template>
    </template>
  </section>
</template>

<script lang="ts">
import { defineComponent, type PropType } from "vue";

import type {
  CmsConfigDocument,
  CmsField,
  PageData,
  PageFile,
} from "../types/cms";
import EnumField from "./inputs/EnumField.vue";
import StringField from "./inputs/StringField.vue";

interface EditablePage {
  path: string;
  page: PageData | null;
  parseError?: string;
  dirty: boolean;
  saving: boolean;
}

const SEO_FIELDS = ["title", "description", "ogTitle", "ogDescription", "ogImage"];

export default defineComponent({
  name: "PageEditor",
  components: { StringField, EnumField },
  props: {
    files: {
      type: Array as PropType<PageFile[]>,
      required: true,
    },
    schemas: {
      type: Object as PropType<Record<string, CmsConfigDocument>>,
      required: true,
    },
    owner: { type: String, default: "" },
    repo: { type: String, default: "" },
    localMode: { type: Boolean, default: false },
    statusMessage: { type: String, default: "" },
  },
  emits: ["save-page", "preview-change"],
  data() {
    return {
      pages: [] as EditablePage[],
      activePath: "",
      addComponentName: "",
    };
  },
  computed: {
    activePage(): EditablePage | undefined {
      return this.pages.find((p) => p.path === this.activePath);
    },
    componentNames(): string[] {
      return Object.keys(this.schemas).sort();
    },
    seoFields(): string[] {
      return SEO_FIELDS;
    },
  },
  watch: {
    files: {
      immediate: true,
      deep: true,
      handler(files: PageFile[]) {
        this.pages = files.map((f) => ({
          path: f.path,
          parseError: f.parseError,
          page: f.page ? JSON.parse(JSON.stringify(f.page)) : null,
          dirty: false,
          saving: false,
        }));
        if ((!this.activePath || !this.pages.find((p) => p.path === this.activePath)) && this.pages.length) {
          this.activePath = this.pages[0].path;
        }
      },
    },
  },
  methods: {
    inputComponentFor(field: CmsField) {
      if (field.type === "string") return "StringField";
      if (field.type === "enum") return "EnumField";
      return null;
    },
    extraProps(section: { component: string; props: Record<string, unknown> }): string[] {
      const schema = this.schemas[section.component];
      if (!schema) return Object.keys(section.props);
      return Object.keys(section.props).filter((k) => !(k in schema));
    },
    markDirty() {
      if (this.activePage) {
        this.activePage.dirty = true;
        this.emitPreview();
      }
    },
    emitPreview() {
      if (!this.activePage?.page) return;
      this.$emit("preview-change", {
        path: this.activePage.path,
        page: JSON.parse(JSON.stringify(this.activePage.page)),
      });
    },
    updateSeo(key: string, value: string) {
      if (!this.activePage?.page) return;
      this.activePage.page.seo[key] = value;
      this.markDirty();
    },
    updateSectionProp(idx: number, key: string, value: unknown) {
      if (!this.activePage?.page) return;
      this.activePage.page.sections[idx].props[key] = value;
      this.markDirty();
    },
    updateSectionPropJson(idx: number, key: string, raw: string) {
      if (!this.activePage?.page) return;
      try {
        this.activePage.page.sections[idx].props[key] = JSON.parse(raw);
        this.markDirty();
      } catch {}
    },
    moveSection(idx: number, direction: number) {
      if (!this.activePage?.page) return;
      const sections = this.activePage.page.sections;
      const target = idx + direction;
      if (target < 0 || target >= sections.length) return;
      const temp = sections[idx];
      sections[idx] = sections[target];
      sections[target] = temp;
      this.markDirty();
    },
    removeSection(idx: number) {
      if (!this.activePage?.page) return;
      this.activePage.page.sections.splice(idx, 1);
      this.markDirty();
    },
    addSection() {
      if (!this.activePage?.page || !this.addComponentName) return;
      const schema = this.schemas[this.addComponentName];
      const props: Record<string, unknown> = {};
      if (schema) {
        for (const [key, field] of Object.entries(schema)) {
          props[key] = field.default ?? "";
        }
      }
      this.activePage.page.sections.push({
        component: this.addComponentName,
        props,
      });
      this.addComponentName = "";
      this.markDirty();
    },
    savePage() {
      if (!this.activePage?.page || this.activePage.saving) return;
      if (!this.localMode && (!this.owner || !this.repo)) return;

      this.activePage.saving = true;
      const page = this.activePage;

      this.$emit(
        "save-page",
        {
          owner: this.owner,
          repo: this.repo,
          path: page.path,
          page: page.page,
        },
        () => {
          page.dirty = false;
          page.saving = false;
        },
        () => {
          page.saving = false;
        },
      );
    },
  },
});
</script>

<style scoped>
.page-editor-panel {
  padding: 1rem;
}

.editor-head {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  align-items: center;
}

.subtle {
  color: var(--subtle);
  margin: 0.35rem 0 0;
}

.page-tabs {
  display: flex;
  gap: 0.25rem;
  margin-top: 0.75rem;
  flex-wrap: wrap;
}

.page-tab {
  background: transparent;
  border: 1px solid var(--border);
  color: var(--subtle);
  padding: 0.35rem 0.75rem;
  border-radius: 8px;
  cursor: pointer;
  font: inherit;
  font-size: 0.82rem;
  font-family: var(--mono);
  transition: all 0.15s;
}

.page-tab[data-active="true"] {
  background: var(--accent);
  color: #fff;
  border-color: var(--accent);
}

.page-toolbar {
  display: flex;
  justify-content: flex-end;
  margin-top: 0.75rem;
}

.sections-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 1.25rem;
  gap: 0.75rem;
}

.add-section-wrap {
  display: flex;
  gap: 0.35rem;
  align-items: center;
}

.add-select {
  min-width: 140px;
  font-size: 0.82rem;
}

.section-card {
  margin-top: 0.75rem;
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 0.75rem;
  background: #fff;
}

.section-summary {
  cursor: pointer;
  list-style: none;
  padding: 0.25rem 0;
}

.section-summary::-webkit-details-marker {
  display: none;
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.component-badge {
  display: inline-block;
  background: var(--panel-muted);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 0.2rem 0.6rem;
  font-size: 0.82rem;
  font-weight: 600;
}

.section-actions {
  display: flex;
  gap: 0.25rem;
}

.btn-icon {
  background: transparent;
  border: 1px solid var(--border);
  border-radius: 6px;
  cursor: pointer;
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  font-size: 0.7rem;
  color: var(--subtle);
  transition: all 0.15s;
}

.btn-icon:hover:not(:disabled) {
  background: var(--panel-muted);
}

.btn-icon:disabled {
  opacity: 0.3;
  cursor: default;
}

.btn-danger:hover:not(:disabled) {
  background: #fde8e8;
  border-color: #e74c3c;
  color: #c0392b;
}

.field-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 0.75rem;
  margin-top: 0.5rem;
}

.field-card {
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 0.75rem;
  background: var(--panel-muted);
}

.json-field {
  min-height: 60px;
  resize: vertical;
  font-size: 0.78rem;
}
</style>
