<template>
  <section class="panel editor-panel">
    <div class="editor-head">
      <div>
        <p class="panel-title">CMS Config Editor</p>
        <p class="subtle" v-if="owner && repo">{{ owner }}/{{ repo }}</p>
      </div>
      <p class="status-ok" v-if="statusMessage">{{ statusMessage }}</p>
    </div>

    <p v-if="!docs.length" class="subtle">
      Select a folder to load `.config.json` CMS definitions.
    </p>

    <article
      v-for="doc in docs"
      :key="doc.path"
      class="config-card"
    >
      <header class="config-head">
        <p class="monospace path">{{ doc.path }}</p>
        <button
          class="btn btn-primary"
          type="button"
          :disabled="!doc.dirty || doc.saving || !doc.config"
          @click="saveDoc(doc.path)"
        >
          {{ doc.saving ? "Saving..." : doc.dirty ? "Save" : "Saved" }}
        </button>
      </header>

      <p v-if="doc.parseError" class="status-error">
        Could not parse this file: {{ doc.parseError }}
      </p>

      <div v-else-if="doc.config" class="field-grid">
        <section
          v-for="fieldKey in fieldKeys(doc.config)"
          :key="`${doc.path}-${fieldKey}`"
          class="field-card"
        >
          <component
            :is="componentFor(doc.config[fieldKey])"
            v-if="componentFor(doc.config[fieldKey])"
            :input-id="`${doc.path}-${fieldKey}`"
            :label="fieldLabel(fieldKey, doc.config[fieldKey])"
            :field="doc.config[fieldKey]"
            :model-value="doc.config[fieldKey].value"
            @update:modelValue="updateField(doc.path, fieldKey, $event)"
          />

          <div v-else>
            <p class="field-label">{{ fieldKey }}</p>
            <p class="status-error">
              Unsupported input type: {{ doc.config[fieldKey].type }}
            </p>
          </div>
        </section>
      </div>
    </article>
  </section>
</template>

<script lang="ts">
import { defineComponent, type PropType } from "vue";

import type { CmsConfigDocument, CmsConfigFile, CmsField } from "../types/cms";
import EnumField from "./inputs/EnumField.vue";
import StringField from "./inputs/StringField.vue";

interface EditableDoc {
  path: string;
  config: CmsConfigDocument | null;
  parseError?: string;
  dirty: boolean;
  saving: boolean;
}

export default defineComponent({
  name: "CmsConfigEditor",
  components: {
    StringField,
    EnumField,
  },
  props: {
    files: {
      type: Array as PropType<CmsConfigFile[]>,
      required: true,
    },
    owner: {
      type: String,
      default: "",
    },
    repo: {
      type: String,
      default: "",
    },
    statusMessage: {
      type: String,
      default: "",
    },
  },
  emits: ["save-file", "preview-change"],
  data() {
    return {
      docs: [] as EditableDoc[],
    };
  },
  watch: {
    files: {
      immediate: true,
      deep: true,
      handler(files: CmsConfigFile[]) {
        this.docs = files.map((file) => ({
          path: file.path,
          parseError: file.parseError,
          config: file.config ? JSON.parse(JSON.stringify(file.config)) : null,
          dirty: false,
          saving: false,
        }));
      },
    },
  },
  methods: {
    fieldKeys(config: CmsConfigDocument): string[] {
      return Object.keys(config);
    },
    componentFor(field: CmsField) {
      if (field.type === "string") {
        return "StringField";
      }

      if (field.type === "enum") {
        return "EnumField";
      }

      return null;
    },
    fieldLabel(fieldKey: string, field: CmsField): string {
      return field.title || fieldKey;
    },
    updateField(path: string, key: string, value: unknown) {
      const target = this.docs.find((doc) => doc.path === path);

      if (!target?.config || !target.config[key]) {
        return;
      }

      target.config[key].value = value;
      target.dirty = true;
      this.$emit("preview-change", {
        path: target.path,
        content: JSON.parse(JSON.stringify(target.config)) as CmsConfigDocument,
      });
    },
    saveDoc(path: string) {
      const target = this.docs.find((doc) => doc.path === path);

      if (!target?.config || !this.owner || !this.repo || target.saving) {
        return;
      }

      target.saving = true;
      this.$emit(
        "save-file",
        {
          owner: this.owner,
          repo: this.repo,
          path: target.path,
          content: target.config,
        },
        () => {
          target.dirty = false;
          target.saving = false;
        },
        () => {
          target.saving = false;
        },
      );
    },
  },
});
</script>

<style scoped>
.editor-panel {
  padding: 1rem;
  min-height: 460px;
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

.config-card {
  margin-top: 1rem;
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 1rem;
  background: #fff;
}

.config-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.path {
  margin: 0;
  color: var(--subtle);
}

.field-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 0.75rem;
}

.field-card {
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 0.75rem;
  background: var(--panel-muted);
}
</style>
