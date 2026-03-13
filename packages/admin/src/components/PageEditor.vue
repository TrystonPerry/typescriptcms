<template>
  <section class="panel editor-panel">
    <div class="stack-head">
      <p class="status-ok" v-if="statusMessage">{{ statusMessage }}</p>
    </div>

    <p v-if="!pages.length" class="subtle">No pages available.</p>

    <template v-else>
      <article v-if="activePage" class="stack-form">
        <p v-if="activePage.parseError" class="status-error">
          Could not load this page: {{ activePage.parseError }}
        </p>

        <template v-else-if="activePage.page">
          <section class="stack-section">
            <p class="section-title">SEO</p>
            <div class="stack-fields">
              <div class="stack-group" v-for="key in seoFields" :key="key">
                <label class="field-label" :for="`seo-${key}`">
                  {{ formatLabel(key) }}
                </label>
                <input
                  :id="`seo-${key}`"
                  class="field-input"
                  type="text"
                  :value="activePage.page.seo[key] ?? ''"
                  @input="
                    updateSeo(key, ($event.target as HTMLInputElement).value)
                  "
                />
              </div>
            </div>
          </section>

          <section class="stack-section">
            <div class="stack-head-row">
              <p class="section-title">Sections</p>
              <p class="subtle">{{ activePage.page.sections.length }} total</p>
            </div>

            <div class="stack-group" v-if="componentNames.length">
              <label class="field-label" for="new-section">Add section</label>
              <div class="row-actions">
                <select
                  id="new-section"
                  class="field-select"
                  v-model="addComponentName"
                >
                  <option value="" disabled>Select type</option>
                  <option
                    v-for="name in componentNames"
                    :key="name"
                    :value="name"
                  >
                    {{ formatLabel(name) }}
                  </option>
                </select>
                <button
                  class="btn btn-ghost"
                  :disabled="!addComponentName"
                  @click="addSection"
                >
                  Add
                </button>
              </div>
            </div>

            <div
              v-for="(section, idx) in activePage.page.sections"
              :key="idx"
              class="section-card"
            >
              <div class="stack-head-row">
                <p class="section-name">
                  Section {{ idx + 1 }} - {{ formatLabel(section.component) }}
                </p>
                <div class="row-actions">
                  <button
                    class="btn btn-ghost"
                    :disabled="idx === 0"
                    @click="moveSection(idx, -1)"
                  >
                    Move up
                  </button>
                  <button
                    class="btn btn-ghost"
                    :disabled="idx === activePage!.page!.sections.length - 1"
                    @click="moveSection(idx, 1)"
                  >
                    Move down
                  </button>
                  <button class="btn btn-danger" @click="removeSection(idx)">
                    Remove
                  </button>
                </div>
              </div>

              <div class="stack-fields" v-if="schemas[section.component]">
                <div
                  class="stack-group"
                  v-for="fieldKey in Object.keys(schemas[section.component])"
                  :key="`${idx}-${fieldKey}`"
                >
                  <component
                    :is="
                      inputComponentFor(schemas[section.component][fieldKey])
                    "
                    v-if="
                      inputComponentFor(schemas[section.component][fieldKey])
                    "
                    :input-id="`section-${idx}-${fieldKey}`"
                    :label="
                      schemas[section.component][fieldKey].title ||
                      formatLabel(fieldKey)
                    "
                    :field="schemas[section.component][fieldKey]"
                    :model-value="section.props[fieldKey] ?? ''"
                    @update:modelValue="
                      updateSectionProp(idx, fieldKey, $event)
                    "
                  />
                  <div v-else>
                    <label class="field-label">
                      {{ formatLabel(fieldKey) }}
                    </label>
                    <input
                      class="field-input"
                      type="text"
                      :value="String(section.props[fieldKey] ?? '')"
                      @input="
                        updateSectionProp(
                          idx,
                          fieldKey,
                          ($event.target as HTMLInputElement).value
                        )
                      "
                    />
                  </div>
                </div>
              </div>

              <div class="stack-fields" v-if="extraProps(section).length">
                <div
                  class="stack-group"
                  v-for="key in extraProps(section)"
                  :key="`${idx}-extra-${key}`"
                >
                  <label class="field-label">{{ formatLabel(key) }}</label>
                  <textarea
                    class="field-input json-field"
                    :value="JSON.stringify(section.props[key], null, 2)"
                    @change="
                      updateSectionPropJson(
                        idx,
                        key,
                        ($event.target as HTMLTextAreaElement).value
                      )
                    "
                  />
                </div>
              </div>
            </div>
          </section>
        </template>

        <button
          class="btn btn-primary"
          :disabled="!activePage.dirty || activePage.saving"
          @click="savePage"
        >
          {{
            activePage.saving
              ? "Saving..."
              : activePage.dirty
              ? "Save changes"
              : "No Changes"
          }}
        </button>
      </article>
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

const SEO_FIELDS = [
  "title",
  "description",
  "ogTitle",
  "ogDescription",
  "ogImage",
];

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
  emits: ["save-page"],
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
        if (
          (!this.activePath ||
            !this.pages.find((p) => p.path === this.activePath)) &&
          this.pages.length
        ) {
          this.activePath = this.pages[0].path;
        }
      },
    },
  },
  methods: {
    pageLabel(path: string): string {
      const raw = path.split("/").pop() || path;
      return raw
        .replace(/\.page\.json$/, "")
        .replace(/[-_]/g, " ")
        .replace(/\b\w/g, (char) => char.toUpperCase());
    },
    formatLabel(value: string): string {
      return value
        .replace(/([a-z])([A-Z])/g, "$1 $2")
        .replace(/[-_]/g, " ")
        .replace(/\b\w/g, (char) => char.toUpperCase());
    },
    inputComponentFor(field: CmsField) {
      if (field.type === "string") return "StringField";
      if (field.type === "enum") return "EnumField";
      return null;
    },
    extraProps(section: {
      component: string;
      props: Record<string, unknown>;
    }): string[] {
      const schema = this.schemas[section.component];
      if (!schema) return Object.keys(section.props);
      return Object.keys(section.props).filter((k) => !(k in schema));
    },
    markDirty() {
      if (this.activePage) {
        this.activePage.dirty = true;
      }
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
        }
      );
    },
  },
});
</script>

<style scoped>
.editor-panel {
  padding: 1.25rem;
  min-height: 420px;
}

.stack-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.subtle {
  color: var(--subtle);
  margin: 0;
}

.stack-form {
  margin-top: 1rem;
  display: grid;
  gap: 1rem;
}

.stack-head-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.stack-fields {
  display: grid;
  gap: 0.75rem;
  margin-top: 0.75rem;
}

.stack-group {
  display: grid;
  gap: 0.4rem;
}

.section-title {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 700;
}

.section-name {
  margin: 0;
  font-size: 0.92rem;
  font-weight: 700;
}

.section-card {
  margin-top: 0.75rem;
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 0.85rem;
}

.row-actions {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  flex-wrap: wrap;
}

.json-field {
  min-height: 72px;
  resize: vertical;
}
</style>
