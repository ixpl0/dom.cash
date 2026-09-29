<template>
  <div
    ref="editorRoot"
    class="flex flex-col gap-3"
    data-testid="docs-field-editor"
  >
    <div
      v-for="(field, index) in modelValue"
      :key="field.key"
      class="flex items-start gap-2 border-b border-base-300 pb-3 last:border-b-0 sm:border-b-0 sm:pb-0"
      data-testid="docs-field-editor-row"
    >
      <div class="grid flex-1 gap-2 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <input
          type="text"
          class="input input-bordered input-sm w-full"
          :class="{ 'input-error': isMissingName(field) }"
          :value="field.name"
          :maxlength="DOC_FIELD_NAME_MAX_LENGTH"
          :placeholder="t('docs.document.fieldNamePlaceholder')"
          :data-field-key="field.key"
          data-testid="docs-field-name-input"
          @input="updateField(index, 'name', $event)"
        >
        <textarea
          class="textarea textarea-bordered textarea-sm min-h-8 w-full leading-snug [field-sizing:content]"
          :value="field.value"
          :rows="countRows(field.value)"
          :maxlength="DOC_FIELD_VALUE_MAX_LENGTH"
          :placeholder="t('docs.document.fieldValuePlaceholder')"
          data-testid="docs-field-value-input"
          @input="updateField(index, 'value', $event)"
        />
      </div>

      <div class="flex items-center">
        <button
          type="button"
          class="btn btn-ghost btn-xs btn-square"
          :disabled="index === 0"
          :aria-label="t('docs.document.moveFieldUp')"
          data-testid="docs-field-move-up"
          @click="moveField(index, -1)"
        >
          <Icon
            name="heroicons:arrow-up"
            size="14"
          />
        </button>
        <button
          type="button"
          class="btn btn-ghost btn-xs btn-square"
          :disabled="index === modelValue.length - 1"
          :aria-label="t('docs.document.moveFieldDown')"
          data-testid="docs-field-move-down"
          @click="moveField(index, 1)"
        >
          <Icon
            name="heroicons:arrow-down"
            size="14"
          />
        </button>
        <button
          type="button"
          class="btn btn-ghost btn-xs btn-square hover:text-error"
          :aria-label="t('docs.document.removeField')"
          data-testid="docs-field-remove"
          @click="removeField(index)"
        >
          <Icon
            name="heroicons:x-mark"
            size="14"
          />
        </button>
      </div>
    </div>

    <button
      type="button"
      class="btn btn-outline btn-sm w-fit"
      :disabled="modelValue.length >= DOC_MAX_FIELDS"
      data-testid="docs-add-field-button"
      @click="addField"
    >
      <Icon
        name="heroicons:plus"
        size="16"
      />
      {{ t('docs.document.addField') }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { DOC_FIELD_NAME_MAX_LENGTH, DOC_FIELD_VALUE_MAX_LENGTH, DOC_MAX_FIELDS } from '~~/shared/schemas/docs'
import type { EditableDocField } from '~/types/docs'

type EditableProperty = 'name' | 'value'

interface Props {
  modelValue: EditableDocField[]
  showErrors: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [fields: EditableDocField[]]
}>()

const MAX_TEXTAREA_ROWS = 6
const CHARACTERS_PER_ROW = 40

const { t } = useI18n()

const editorRoot = ref<HTMLElement | null>(null)

const isMissingName = (field: EditableDocField): boolean =>
  props.showErrors && field.name.trim() === '' && field.value.trim() !== ''

const countRows = (value: string): number =>
  Math.min(MAX_TEXTAREA_ROWS, value.split('\n').reduce((rows, line) => rows + Math.max(1, Math.ceil(line.length / CHARACTERS_PER_ROW)), 0))

const readInputValue = (event: Event): string =>
  event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement ? event.target.value : ''

const updateField = (index: number, property: EditableProperty, event: Event): void => {
  const value = readInputValue(event)
  emit('update:modelValue', props.modelValue.map((field, fieldIndex) =>
    fieldIndex === index ? { ...field, [property]: value } : field))
}

const moveField = (index: number, offset: number): void => {
  const targetIndex = index + offset
  const movedField = props.modelValue[index]
  const targetField = props.modelValue[targetIndex]

  if (!movedField || !targetField) {
    return
  }

  emit('update:modelValue', props.modelValue.map((field, fieldIndex) => {
    if (fieldIndex === index) {
      return targetField
    }
    return fieldIndex === targetIndex ? movedField : field
  }))
}

const removeField = (index: number): void => {
  emit('update:modelValue', props.modelValue.filter((_, fieldIndex) => fieldIndex !== index))
}

const addField = (): void => {
  const key = crypto.randomUUID()
  emit('update:modelValue', [...props.modelValue, { key, name: '', value: '' }])

  nextTick(() => {
    const input = editorRoot.value?.querySelector(`[data-field-key="${key}"]`)
    if (input instanceof HTMLInputElement) {
      input.focus()
    }
  })
}
</script>
