<template>
  <div class="flex flex-wrap items-center justify-end gap-2">
    <DocsRecognitionEffortSelect test-id="docs-recognize-effort-select" />

    <button
      v-if="document.fields.length === 0"
      type="button"
      class="btn btn-outline btn-primary btn-sm"
      :disabled="isBusy"
      data-testid="docs-recognize-button"
      @click="recognize('merge')"
    >
      <Icon
        name="heroicons:sparkles"
        size="16"
      />
      {{ t('docs.recognition.recognize') }}
    </button>

    <div
      v-else
      ref="dropdownRef"
      class="dropdown dropdown-end"
      @focusin="handleFocusIn"
      @focusout="handleFocusOut"
    >
      <div
        :tabindex="isBusy ? -1 : 0"
        role="button"
        class="btn btn-outline btn-primary btn-sm"
        :class="{ 'btn-disabled': isBusy }"
        data-testid="docs-recognize-menu-button"
      >
        <Icon
          name="heroicons:sparkles"
          size="16"
        />
        {{ t('docs.recognition.menu') }}
        <Icon
          name="heroicons:chevron-down"
          size="14"
        />
      </div>
      <ul
        tabindex="0"
        class="dropdown-content menu z-[1] mt-1 w-72 rounded-box bg-base-100 p-2 shadow"
      >
        <li>
          <button
            type="button"
            data-testid="docs-recognize-add-new"
            @click="recognize('merge')"
          >
            {{ t('docs.recognition.addNew') }}
          </button>
        </li>
        <li>
          <button
            type="button"
            data-testid="docs-recognize-replace"
            @click="recognize('replace')"
          >
            {{ t('docs.recognition.replace') }}
          </button>
        </li>
        <li
          v-if="document.images.length > DOC_MAX_RECOGNITION_IMAGES"
          class="px-3 py-1 text-xs text-base-content/60"
        >
          {{ t('docs.recognition.limitHint', { count: DOC_MAX_RECOGNITION_IMAGES }) }}
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { DOC_MAX_RECOGNITION_IMAGES } from '~~/shared/schemas/docs'
import type { DocDocument, DocRecognitionMode } from '~~/shared/types/docs'

interface Props {
  document: DocDocument
}

const props = defineProps<Props>()

const docsStore = useDocsStore()
const { confirm } = useConfirmation()
const { t } = useI18n()
const { dropdownRef, handleFocusIn, handleFocusOut, close } = useDropdownBackHandler()

const isBusy = computed(() => docsStore.isBusy(props.document.id))

const confirmReplace = (): Promise<boolean> => confirm({
  title: t('docs.recognition.replaceTitle'),
  message: t('docs.recognition.replaceMessage'),
  variant: 'warning',
  confirmText: t('docs.recognition.replaceConfirm'),
  cancelText: t('common.cancel'),
  icon: 'heroicons:sparkles',
})

const recognize = async (mode: DocRecognitionMode): Promise<void> => {
  close()

  if (mode === 'replace' && !await confirmReplace()) {
    return
  }

  await docsStore.recognizeDocument(props.document.id, { mode })
}
</script>
