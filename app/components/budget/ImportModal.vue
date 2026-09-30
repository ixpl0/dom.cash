<template>
  <UiDialog
    :is-open="isOpen"
    data-testid="import-modal"
    content-class="modal-box sm:max-h-[90vh] sm:w-[calc(100vw-2rem)] sm:max-w-5xl flex flex-col"
    :title="t('import.title')"
    @close="hide"
  >
    <div class="flex-1 overflow-y-auto min-h-0">
      <div
        v-if="!importResult"
        class="mb-4"
      >
        <div class="form-control w-full mb-4">
          <label class="label flex flex-col items-start gap-2">
            <span class="label-text">{{ t('import.selectFile') }}</span>
            <input
              ref="fileInput"
              type="file"
              accept=".json,application/json"
              class="file-input file-input-bordered w-full"
              :disabled="isImporting"
              data-testid="import-file-input"
              @change="handleFileSelect"
            >
          </label>
        </div>

        <div
          v-if="selectedFile"
          class="flex flex-col gap-2 my-8"
        >
          <div class="label-text">
            {{ t('import.conflictStrategy') }}
          </div>

          <div class="form-control">
            <label class="label cursor-pointer">
              <input
                v-model="importMode"
                type="radio"
                name="importMode"
                value="skip"
                class="radio mr-2"
                :disabled="isImporting"
                data-testid="import-strategy-skip"
              >
              <span class="label-text whitespace-break-spaces">{{ t('import.strategySkip') }}</span>
            </label>
          </div>

          <div class="form-control">
            <label class="label cursor-pointer">
              <input
                v-model="importMode"
                type="radio"
                name="importMode"
                value="overwrite"
                class="radio mr-2"
                :disabled="isImporting"
                data-testid="import-strategy-overwrite"
              >
              <span class="label-text whitespace-break-spaces">{{ t('import.strategyOverwrite') }}</span>
            </label>
          </div>
        </div>

        <div
          v-if="previewData"
          class="mb-4 p-4 bg-base-200 rounded"
        >
          <h4 class="font-semibold mb-2">
            {{ t('import.previewTitle') }}
          </h4>
          <p
            class="text-sm"
            data-testid="import-preview-username"
          >
            {{ t('import.previewUser') }} {{ previewData.user.username }}
          </p>
          <p
            class="text-sm"
            data-testid="import-preview-currency"
          >
            {{ t('import.previewCurrency') }} {{ previewData.user.mainCurrency }}
          </p>
          <p class="text-sm">
            {{ t('import.previewMonths') }} {{ previewData.months.length }}
          </p>
          <p class="text-sm">
            {{ t('import.previewEntries') }} {{ totalEntries }}
          </p>
          <p class="text-sm">
            {{ t('import.previewExportDate') }} {{ formatDate(previewData.exportDate) }}
          </p>
        </div>
      </div>

      <div
        v-if="error"
        class="alert alert-error mb-4"
        data-testid="import-error"
      >
        <span>{{ error }}</span>
      </div>

      <div
        v-if="isImporting"
        class="mb-4"
        data-testid="import-loading"
      >
        <div class="loading loading-spinner loading-sm mr-2" />
        <span>{{ t('import.importing') }}</span>
      </div>

      <div
        v-if="importResult"
        class="mb-4 p-4 rounded bg-success text-success-content"
        data-testid="import-result"
      >
        <h4 class="font-semibold mb-2">
          {{ t('import.resultTitle') }}
        </h4>
        <p class="text-sm">
          {{ t('import.importedMonths') }} {{ importResult.importedMonths }}
        </p>
        <p class="text-sm">
          {{ t('import.importedEntries') }} {{ importResult.importedEntries }}
        </p>
        <p class="text-sm">
          {{ t('import.skippedMonths') }} {{ importResult.skippedMonths }}
        </p>
      </div>
    </div>

    <div class="modal-action flex-shrink-0 flex-wrap">
      <button
        v-if="!importResult"
        class="btn btn-ghost"
        :disabled="isImporting"
        data-testid="import-cancel-button"
        @click="hide"
      >
        {{ t('import.cancel') }}
      </button>
      <button
        v-if="importResult"
        class="btn btn-primary"
        data-testid="import-close-button"
        @click="hide"
      >
        {{ t('import.close') }}
      </button>
      <button
        v-if="!importResult"
        class="btn btn-primary"
        data-testid="import-submit-button"
        :disabled="!selectedFile || isImporting"
        @click="handleImport"
      >
        <span
          v-if="isImporting"
          class="loading loading-spinner loading-sm"
        />
        <span v-else>{{ t('import.importButton') }}</span>
      </button>
    </div>
  </UiDialog>
</template>

<script setup lang="ts">
import type { BudgetExportData, BudgetImportOptions, BudgetImportResult } from '~~/shared/types/export-import'
import { BUDGET_EXPORT_VERSIONS, budgetExportSchema } from '~~/shared/schemas/export-import'

interface Props {
  isOpen: boolean
  targetUsername?: string
}

interface Emits {
  (e: 'close' | 'imported'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()
const fileInput = ref<HTMLInputElement>()
const selectedFile = ref<File | null>(null)
const previewData = ref<BudgetExportData | null>(null)
const error = ref<string>('')
const isImporting = ref(false)
const importResult = ref<BudgetImportResult | null>(null)

type ImportMode = 'skip' | 'overwrite'

const importMode = ref<ImportMode>('skip')
const { t, locale } = useI18n()
const { formatError } = useServerError()

const options = computed<BudgetImportOptions>(() => ({
  strategy: importMode.value,
}))

const totalEntries = computed(() => {
  if (!previewData.value) {
    return 0
  }
  return previewData.value.months.reduce((sum, month) => sum + month.entries.length, 0)
})

const handleFileSelect = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]

  if (!file) {
    selectedFile.value = null
    previewData.value = null
    error.value = ''
    return
  }

  try {
    const content: unknown = JSON.parse(await file.text())
    const parsedExport = budgetExportSchema.safeParse(content)

    if (!parsedExport.success) {
      error.value = isSupportedVersion(content) ? t('import.fileReadError') : t('import.unsupportedVersion')
      selectedFile.value = null
      previewData.value = null
      return
    }

    selectedFile.value = file
    previewData.value = parsedExport.data
    error.value = ''
    importResult.value = null
  }
  catch {
    error.value = t('import.fileReadError')
    selectedFile.value = null
    previewData.value = null
  }
}

const handleImport = async () => {
  if (!selectedFile.value || !previewData.value) {
    return
  }

  isImporting.value = true
  error.value = ''

  try {
    importResult.value = await $fetch<BudgetImportResult>('/api/budget/import', {
      method: 'POST',
      body: {
        data: previewData.value,
        options: options.value,
        username: props.targetUsername,
      },
    })
    emit('imported')
  }
  catch (fetchError: unknown) {
    error.value = formatError(fetchError, t('import.importError'))
    importResult.value = null
  }
  finally {
    isImporting.value = false
  }
}

const isSupportedVersion = (content: unknown): boolean =>
  typeof content === 'object' && content !== null && 'version' in content
  && BUDGET_EXPORT_VERSIONS.some(version => version === content.version)

const hide = () => {
  if (isImporting.value) {
    return
  }

  selectedFile.value = null
  previewData.value = null
  error.value = ''
  importResult.value = null
  importMode.value = 'skip'
  if (fileInput.value) {
    fileInput.value.value = ''
  }
  emit('close')
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleString(locale.value)
}
</script>
