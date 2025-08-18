<template>
  <div>
    <div
      v-if="isLoading"
      class="text-center py-12"
    >
      <div class="loading loading-spinner loading-lg" />
      <p class="mt-4">
        Загрузка бюджета...
      </p>
    </div>

    <div
      v-else-if="error"
      class="text-center py-12"
    >
      <div class="text-6xl mb-4">
        ❌
      </div>
      <h2 class="text-2xl font-bold mb-2">
        Ошибка доступа
      </h2>
      <p class="text-lg opacity-70 mb-6">
        {{ error || 'Не удалось загрузить бюджет' }}
      </p>
      <NuxtLink
        to="/budget"
        class="btn btn-primary"
      >
        Вернуться к своему бюджету
      </NuxtLink>
    </div>

    <div
      v-else-if="!budget || !budget.months || budget.months.length === 0"
      class="text-center py-12"
    >
      <div class="text-6xl mb-4">
        💰
      </div>
      <h2 class="text-2xl font-bold mb-2">
        Пока нет данных о бюджете
      </h2>
      <p class="text-lg opacity-70 mb-6">
        {{ !canEdit ? 'Этот пользователь ещё не создал месяцы бюджета' : 'Начните с создания месяца и добавления источников баланса или импортируйте данные' }}
      </p>
      <div
        v-if="canEdit"
        class="flex flex-col sm:flex-row gap-4 justify-center"
      >
        <button
          class="btn btn-primary btn-lg"
          :disabled="isCreatingCurrentMonth"
          @click="createCurrentMonth"
        >
          <span
            v-if="isCreatingCurrentMonth"
            class="loading loading-spinner loading-sm"
          />
          <span v-if="!isCreatingCurrentMonth">
            📅 Создать {{ monthNames[currentMonth] }} {{ currentYear }}
          </span>
          <span v-else>Создание месяца...</span>
        </button>
        <button
          class="btn btn-outline btn-lg"
          @click="openImportModal"
        >
          📥 Импорт бюджета
        </button>
      </div>
    </div>

    <div
      v-else
      class="space-y-6"
    >
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-bold">
            Бюджет {{ budget.user.username }}
          </h1>
          <div class="flex items-center gap-2 mt-2">
            <span class="badge badge-primary">
              {{ getAccessText(budget.access) }}
            </span>
            <UiCurrencyPicker
              v-if="canEdit"
              :model-value="budget.user.mainCurrency"
              placeholder="Основная валюта"
              class="w-70"
              @change="saveCurrency"
            />
            <span
              v-else
              class="opacity-70 text-sm"
            >
              Основная валюта: {{ getCurrencyDisplayText(budget.user.mainCurrency) }}
            </span>
          </div>
        </div>
        <div class="flex gap-2">
          <div
            v-if="canEdit"
            class="flex gap-2"
          >
            <button
              class="btn btn-ghost btn-sm"
              @click="handleExport"
            >
              Экспорт
            </button>
            <button
              class="btn btn-ghost btn-sm"
              @click="openImportModal"
            >
              Импорт
            </button>
          </div>
          <NuxtLink
            v-if="!isOwnBudget"
            to="/budget"
            class="btn btn-outline"
          >
            К своему бюджету
          </NuxtLink>
        </div>
      </div>

      <ul class="timeline timeline-vertical [--timeline-col-start:20ch]">
        <BudgetTimelineAddButton
          v-if="canEdit"
          direction="next"
          :month-text="getNextMonthText()"
          :is-loading="isCreatingNextMonth"
          @create="handleCreateNextMonth"
        />

        <BudgetYear
          v-for="year in years"
          :key="year"
          :year="year"
          :months="groupedData[year] || []"
          :month-names="monthNames"
          :all-months="budget.months"
          :is-read-only="!canEdit"
          :main-currency="budget?.user?.mainCurrency"
          :target-username="!isOwnBudget ? budget?.user?.username : undefined"
          :on-delete-month="props.onDeleteMonth"
        />

        <BudgetTimelineAddButton
          v-if="canEdit"
          direction="previous"
          :month-text="getPreviousMonthText()"
          :is-loading="isCreatingPreviousMonth"
          @create="handleCreatePreviousMonth"
        />
      </ul>
    </div>

    <BudgetImportModal
      :is-open="isImportModalOpen"
      @close="closeImportModal"
      @imported="handleImported"
    />
  </div>
</template>

<script setup lang="ts">
import type { BudgetData } from '~/composables/useBudget'
import { getCurrencyName } from '~~/shared/utils/currencies'
import { useStatSync } from '~/composables/useStatSync'

interface Props {
  budget: BudgetData | null
  canEdit?: boolean
  isLoading?: boolean
  error?: string | null
  onCreateMonth?: (year: number, month: number, copyFromMonthId?: string) => Promise<void>
  onCreateNextMonth?: () => Promise<void>
  onCreatePreviousMonth?: () => Promise<void>
  onGetNextMonth?: () => { year: number, month: number }
  onGetPreviousMonth?: () => { year: number, month: number }
  onUpdateCurrency?: (currency: string) => Promise<void>
  onDeleteMonth?: (monthId: string) => Promise<void>
  onExport?: () => Promise<void>
  onRefresh?: () => Promise<void>
}

const props = withDefaults(defineProps<Props>(), {
  canEdit: false,
  isLoading: false,
  error: null,
  onCreateMonth: undefined,
  onCreateNextMonth: undefined,
  onCreatePreviousMonth: undefined,
  onGetNextMonth: undefined,
  onGetPreviousMonth: undefined,
  onDeleteMonth: undefined,
  onUpdateCurrency: undefined,
  onExport: undefined,
  onRefresh: undefined,
})

const monthNames = [
  'январь', 'февраль', 'март', 'апрель', 'май', 'июнь',
  'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь',
]

const now = new Date()
const currentYear = now.getFullYear()
const currentMonth = now.getMonth()

const isCreatingCurrentMonth = ref(false)
const isCreatingNextMonth = ref(false)
const isCreatingPreviousMonth = ref(false)
const isImportModalOpen = ref(false)

const isOwnBudget = computed(() => props.budget?.access === 'owner')

const groupedData = computed(() => {
  const months = props.budget?.months
  if (!months || !Array.isArray(months)) return {}

  return months.reduce((acc: Record<number, typeof months>, month) => {
    if (!acc[month.year]) {
      acc[month.year] = []
    }
    acc[month.year] = [...(acc[month.year] || []), month]
    return acc
  }, {} as Record<number, typeof months>)
})

const years = computed(() => {
  return Object.keys(groupedData.value)
    .map(Number)
    .sort((a, b) => b - a)
})

const getNextMonthText = (): string => {
  if (props.onGetNextMonth) {
    const nextMonth = props.onGetNextMonth()
    return `${monthNames[nextMonth.month]} ${nextMonth.year}`
  }
  const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1
  const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear
  return `${monthNames[nextMonth]} ${nextYear}`
}

const getPreviousMonthText = (): string => {
  if (props.onGetPreviousMonth) {
    const prevMonth = props.onGetPreviousMonth()
    return `${monthNames[prevMonth.month]} ${prevMonth.year}`
  }
  const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1
  const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear
  return `${monthNames[prevMonth]} ${prevYear}`
}

const handleCreateNextMonth = async (): Promise<void> => {
  if (!props.canEdit || !props.onCreateNextMonth) return

  isCreatingNextMonth.value = true

  try {
    await props.onCreateNextMonth()
  }
  catch (error) {
    console.error('Error creating next month:', error)
  }
  finally {
    isCreatingNextMonth.value = false
  }
}

const handleCreatePreviousMonth = async (): Promise<void> => {
  if (!props.canEdit || !props.onCreatePreviousMonth) return

  isCreatingPreviousMonth.value = true

  try {
    await props.onCreatePreviousMonth()
  }
  catch (error) {
    console.error('Error creating previous month:', error)
  }
  finally {
    isCreatingPreviousMonth.value = false
  }
}

const createCurrentMonth = async (): Promise<void> => {
  if (!props.canEdit || !props.onCreateMonth) return

  isCreatingCurrentMonth.value = true

  try {
    await props.onCreateMonth(currentYear, currentMonth)
  }
  catch (error) {
    console.error('Error creating current month:', error)
  }
  finally {
    isCreatingCurrentMonth.value = false
  }
}

const getCurrencyDisplayText = (currencyCode: string): string => {
  const currencyName = getCurrencyName(currencyCode)
  return `${currencyCode} - ${currencyName}`
}

const saveCurrency = async (newCurrency: string): Promise<void> => {
  if (!props.onUpdateCurrency) {
    console.warn('onUpdateCurrency handler not provided')
    return
  }

  try {
    await props.onUpdateCurrency(newCurrency)
  }
  catch (error) {
    console.error('Failed to update currency:', error)
    alert('Не удалось обновить валюту. Попробуйте ещё раз.')
  }
}

const getAccessText = (access: string): string => {
  switch (access) {
    case 'owner':
      return 'Владелец'
    case 'read':
      return 'Только чтение'
    case 'write':
      return 'Чтение и редактирование'
    default:
      return 'Неизвестно'
  }
}

const handleExport = async (): Promise<void> => {
  if (!props.onExport) {
    console.warn('onExport handler not provided')
    return
  }

  try {
    await props.onExport()
  }
  catch (error) {
    console.error('Export failed:', error)
    alert('Не удалось экспортировать бюджет. Попробуйте ещё раз.')
  }
}

const openImportModal = (): void => {
  isImportModalOpen.value = true
}

const closeImportModal = (): void => {
  isImportModalOpen.value = false
}

const handleImported = async (): Promise<void> => {
  if (props.onRefresh) {
    try {
      await props.onRefresh()
    }
    catch (error) {
      console.error('Failed to refresh budget after import:', error)
    }
  }
}

const statSyncInstance = useStatSync()

provide('statSync', statSyncInstance)
</script>
