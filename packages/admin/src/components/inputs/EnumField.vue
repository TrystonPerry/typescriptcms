<template>
  <div>
    <label class="field-label" :for="inputId">{{ label }}</label>
    <select
      :id="inputId"
      class="field-select"
      :value="stringValue"
      @change="onSelect"
    >
      <option
        v-for="option in field.enum"
        :key="option"
        :value="option"
      >
        {{ option }}
      </option>
    </select>
    <small v-if="field.description" class="help-text">{{ field.description }}</small>
  </div>
</template>

<script lang="ts">
import { defineComponent, type PropType } from "vue";

import type { CmsEnumField } from "../../types/cms";

export default defineComponent({
  name: "EnumField",
  props: {
    modelValue: {
      type: String,
      default: "",
    },
    field: {
      type: Object as PropType<CmsEnumField>,
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
    onSelect(event: Event) {
      const target = event.target as HTMLSelectElement;
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
