<template>
  <dialog
    ref="modal"
    class="modal"
    data-testid="import-modal"
    :class="{ 'modal-open': isOpen }"
    @keydown.esc="handleEscapeKey"
  >
    <div class="modal-box">
      <h3 class="font-bold text-lg mb-4">
        Импорт бюджета
      </h3>

      <div
        v-if="!importResult"
        class="mb-4"
      >
        <div class="form-control w-full mb-4">
          <label class="label flex flex-col items-start gap-2">
            <span class="label-text">Выберите файл бюджета (.json)</span>
            <input
              ref="fileInput"
              type="file"
              accept=".json,application/json"
              class="file-input file-input-bordered w-full"
              data-testid="import-file-input"
              @change="handleFileSelect"
            >
          </label>
        </div>

        <div
          v-if="selectedFile"
          class="mb-4"
        >
          <div class="form-control">
            <span class="label-text mb-2 block">Действие для существующих месяцев:</span>

            <label class="label cursor-pointer">
              <span class="label-text">Пропустить (оставить как есть)</span>
              <input
                v-model="importMode"
                type="radio"
                name="importMode"
                value="skip"
                class="radio"
              >
            </label>

            <label class="label cursor-pointer">
              <span class="label-text">Перезаписать (заменить данные)</span>
              <input
                v-model="importMode"
                type="radio"
                name="importMode"
                value="overwrite"
                class="radio"
              >
            </label>
          </div>
        </div>

        <div
          v-if="previewData"
          class="mb-4 p-4 bg-base-200 rounded"
        >
          <h4 class="font-semibold mb-2">
            Предварительный просмотр:
          </h4>
          <p class="text-sm">
            Пользователь: {{ previewData.user.username }}
          </p>
          <p class="text-sm">
            Основная валюта: {{ previewData.user.mainCurrency }}
          </p>
          <p class="text-sm">
            Месяцев: {{ previewData.months.length }}
          </p>
          <p class="text-sm">
            Записей: {{ totalEntries }}
          </p>
          <p class="text-sm">
            Дата экспорта: {{ formatDate(previewData.exportDate) }}
          </p>
        </div>
      </div>

      <div
        v-if="error"
        class="alert alert-error mb-4"
      >
        <span>{{ error }}</span>
      </div>

      <div
        v-if="isImporting"
        class="mb-4"
        data-testid="import-loading"
      >
        <div class="loading loading-spinner loading-sm mr-2" />
        <span>Импорт данных...</span>
      </div>

      <div
        v-if="importResult"
        class="mb-4 p-4 rounded"
        :class="importResult.success ? 'bg-success text-success-content' : 'bg-error text-error-content'"
      >
        <h4 class="font-semibold mb-2">
          Результат импорта:
        </h4>
        <p class="text-sm">
          Импортировано месяцев: {{ importResult.importedMonths }}
        </p>
        <p class="text-sm">
          Импортировано записей: {{ importResult.importedEntries }}
        </p>
        <p class="text-sm">
          Пропущено месяцев: {{ importResult.skippedMonths }}
        </p>
        <div
          v-if="importResult.errors.length > 0"
          class="mt-2"
        >
          <p class="text-sm font-semibold">
            Ошибки:
          </p>
          <ul class="text-xs">
            <li
              v-for="importResultError in importResult.errors"
              :key="importResultError"
            >
              • {{ importResultError }}
            </li>
          </ul>
        </div>
      </div>

      <div class="modal-action">
        <button
          v-if="!importResult"
          class="btn btn-ghost"
          @click="handleClose"
        >
          Отмена
        </button>
        <button
          v-if="importResult"
          class="btn btn-primary"
          data-testid="import-close-button"
          @click="handleClose"
        >
          Закрыть
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
          <span v-else>Импортировать</span>
        </button>
      </div>
    </div>
  </dialog>
</template>

<script setup lang="ts">
import type { BudgetExportData, BudgetImportOptions, BudgetImportResult } from '~~/shared/types/export-import'

interface Props {
  isOpen: boolean
  targetUsername?: string
}

interface Emits {
  (e: 'close' | 'imported'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const modal = ref<HTMLDialogElement>()
const fileInput = ref<HTMLInputElement>()
const selectedFile = ref<File | null>(null)
const previewData = ref<BudgetExportData | null>(null)
const error = ref<string>('')
const isImporting = ref(false)
const importResult = ref<BudgetImportResult | null>(null)
const { confirmClose, markAsChanged, markAsSaved } = useUnsavedChanges()

type ImportMode = 'skip' | 'overwrite'

const importMode = ref<ImportMode>('skip')

const options = computed<BudgetImportOptions>(() => ({
  skipExisting: importMode.value === 'skip',
  overwriteExisting: importMode.value === 'overwrite',
}))

const totalEntries = computed(() => {
  if (!previewData.value) return 0
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
    const text = await file.text()
    const data = JSON.parse(text) as BudgetExportData

    if (data.version !== '1.0') {
      throw new Error('Неподдерживаемая версия файла')
    }

    selectedFile.value = file
    previewData.value = data
    error.value = ''
    importResult.value = null
  }
  catch {
    error.value = 'Не удалось прочитать файл. Убедитесь, что это корректный JSON файл экспорта бюджета.'
    selectedFile.value = null
    previewData.value = null
  }
}

const handleImport = async () => {
  if (!selectedFile.value || !previewData.value) return

  isImporting.value = true
  error.value = ''

  try {
    const response = await $fetch('/api/budget/import', {
      method: 'POST',
      body: {
        data: previewData.value,
        options: options.value,
        targetUsername: props.targetUsername,
      },
    })

    importResult.value = response as BudgetImportResult

    if (response.success) {
      markAsSaved()
      emit('imported')
    }
  }
  catch {
    error.value = 'Ошибка при импорте данных'
    importResult.value = null
  }
  finally {
    isImporting.value = false
  }
}

const startNewImport = () => {
  selectedFile.value = null
  previewData.value = null
  error.value = ''
  importResult.value = null
  importMode.value = 'skip'
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

const handleClose = () => {
  if (!confirmClose()) {
    return
  }

  startNewImport()
  markAsSaved()
  emit('close')
}

const handleEscapeKey = (event: KeyboardEvent): void => {
  event.preventDefault()
  handleClose()
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleString('ru-RU')
}

watch(() => props.isOpen, (isOpen) => {
  if (isOpen) {
    markAsSaved()
  }
})

watch([selectedFile, importMode, previewData], () => {
  if (selectedFile.value || previewData.value) {
    markAsChanged()
  }
})
</script>
