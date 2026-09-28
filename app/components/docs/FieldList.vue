<template>
  <ul
    class="divide-y divide-base-300/70"
    data-testid="docs-field-list"
  >
    <li
      v-for="(field, index) in fields"
      :key="`${index}-${field.name}`"
    >
      <button
        type="button"
        class="group -mx-2 flex w-[calc(100%+1rem)] items-start gap-3 rounded-btn px-2 py-2 text-left transition-colors duration-200 hover:bg-base-300/50"
        :aria-label="t('docs.document.copyField', { name: field.name })"
        data-testid="docs-field"
        @click="copyField(index)"
      >
        <span class="min-w-0 flex-1">
          <span
            class="block text-xs text-base-content/60 break-words"
            data-testid="docs-field-name"
          >
            {{ field.name }}
          </span>
          <span
            class="block font-medium whitespace-pre-wrap break-words"
            data-testid="docs-field-value"
          >
            {{ field.value || '—' }}
          </span>
        </span>
        <Icon
          :name="copiedIndex === index ? 'heroicons:check' : 'heroicons:clipboard-document'"
          size="16"
          class="mt-1 flex-shrink-0 transition-opacity duration-200"
          :class="copiedIndex === index ? 'text-success' : 'opacity-30 group-hover:opacity-100'"
          :data-testid="copiedIndex === index ? 'docs-field-copied' : undefined"
        />
      </button>
    </li>
  </ul>
</template>

<script setup lang="ts">
import type { DocField } from '~~/shared/types/docs'
import { copyText } from '~/utils/clipboard'

interface Props {
  fields: readonly DocField[]
}

const props = defineProps<Props>()

const COPIED_FEEDBACK_MS = 1500

const { t } = useI18n()
const { toast } = useToast()

const copiedIndex = ref<number | null>(null)
let resetTimer: ReturnType<typeof setTimeout> | undefined

const copyField = async (index: number): Promise<void> => {
  const field = props.fields[index]

  if (!field) {
    return
  }

  if (!await copyText(field.value)) {
    toast({ type: 'error', message: t('docs.copy.failed') })
    return
  }

  clearTimeout(resetTimer)
  copiedIndex.value = index
  resetTimer = setTimeout(() => {
    copiedIndex.value = null
  }, COPIED_FEEDBACK_MS)
}

onBeforeUnmount(() => {
  clearTimeout(resetTimer)
})
</script>
