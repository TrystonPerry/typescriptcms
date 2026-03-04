<template>
  <div>
    <label class="field-label" :for="inputId">{{ label }}</label>
    <input
      :id="inputId"
      class="field-input monospace"
      type="text"
      :minlength="field.minLength"
      :maxlength="field.maxLength"
      :value="stringValue"
      @input="onInput"
    />
    <small v-if="field.description" class="help-text">{{ field.description }}</small>
  </div>
</template>

<script lang="ts">
import { defineComponent, type PropType } from "vue";

import type { CmsStringField } from "../../types/cms";

export default defineComponent({
  name: "StringField",
  props: {
    modelValue: {
      type: [String, Number],
      default: "",
    },
    field: {
      type: Object as PropType<CmsStringField>,
      required: true,
    },
    inputId: {
      type: String,
      required: true,
    },
    label: {
      type: String,
      required: true,
    },
  },
  emits: ["update:modelValue"],
  computed: {
    stringValue(): string {
      return String(this.modelValue ?? "");
    },
  },
  methods: {
    onInput(event: Event) {
      const target = event.target as HTMLInputElement;
      this.$emit("update:modelValue", target.value);
    },
  },
});
</script>

<style scoped>
.help-text {
  display: block;
  margin-top: 0.35rem;
  color: var(--subtle);
}
</style>
