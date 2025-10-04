<template>
  <div>
    <div
      v-if="budgetStore.error"
      class="text-center py-12"
    >
      <div class="text-6xl mb-4">
        ❌
      </div>
      <h2 class="text-2xl font-bold mb-2">
        Ошибка доступа
      </h2>
      <p class="text-lg opacity-70 mb-6">
        {{ budgetStore.error || 'Не удалось загрузить бюджет' }}
      </p>
      <NuxtLink
        to="/budget"
        class="btn btn-primary"
      >
        Вернуться к своему бюджету
      </NuxtLink>
    </div>

    <div
      v-else-if="!budgetStore.data || !budgetStore.months || budgetStore.months.length === 0"
      class="text-center py-12"
      data-testid="budget-empty-state"
    >
      <div class="mb-4 flex justify-center">
        <UiLogo class="w-16 h-16" />
      </div>
      <h2
        class="text-2xl font-bold mb-2"
        data-testid="no-budget-message"
      >
        Пока нет данных о бюджете
      </h2>
      <p class="text-lg opacity-70 mb-6">
        {{ !budgetStore.canEdit ? 'Этот пользователь ещё не создал месяцы бюджета' : 'Начните с создания месяца и добавления источников баланса или импортируйте данные' }}
      </p>
      <div
        v-if="budgetStore.canEdit"
        class="flex flex-col sm:flex-row gap-4 justify-center"
      >
        <button
          class="btn btn-primary btn-lg"
          :disabled="isCreatingCurrentMonth"
          data-testid="create-first-month-btn"
          @click="createCurrentMonth"
        >
          <span
            v-if="isCreatingCurrentMonth"
            class="loading loading-spinner loading-sm"
          />
          <span
            v-if="!isCreatingCurrentMonth"
            class="flex items-center gap-2"
          >
            <Icon
              name="heroicons:calendar"
              size="20"
            />
            Создать {{ monthNames[currentMonth] }} {{ currentYear }}
          </span>
          <span v-else>Создание месяца...</span>
        </button>
        <button
          class="btn btn-outline btn-lg"
          data-testid="import-budget-btn"
          @click="openImportModal"
        >
          <Icon
            name="heroicons:arrow-down-tray"
            size="20"
          />
          Импорт бюджета
        </button>
      </div>
    </div>

    <div v-else>
      <div
        class="flex items-center justify-between flex-wrap gap-4 p-6 pb-0"
        data-testid="budget-header"
      >
        <h1
          class="text-3xl font-bold ml-2"
          data-testid="budget-title"
        >
          Бюджет
        </h1>

        <div class="flex items-center flex-wrap gap-2 flex-col sm:flex-row w-full sm:w-auto">
          <span
            v-if="budgetStore.data?.access !== 'owner'"
            class="badge w-full sm:w-auto"
          >
            Бюджет
            {{ budgetStore.data?.user.username }}
          </span>
          <span class="badge w-full sm:w-auto">
            {{ getAccessText(budgetStore.data?.access || 'unknown') }}
          </span>
          <UiCurrencyPicker
            v-if="budgetStore.canEdit"
            :model-value="budgetStore.data?.user.mainCurrency"
            placeholder="Основная валюта"
            class="w-full sm:w-70"
            @change="saveCurrency"
          />
          <span
            v-else
            class="opacity-70 text-sm"
          >
            Основная валюта:
            {{ getCurrencyDisplayText(budgetStore.data?.user.mainCurrency || '') }}
          </span>
        </div>

        <div class="flex gap-2 flex-wrap">
          <button
            class="btn btn-ghost btn-sm"
            data-testid="chart-button"
            @click="modalsStore.openChartModal"
          >
            <Icon
              name="heroicons:chart-bar"
              size="20"
            />
            График
          </button>

          <button
            class="btn btn-ghost btn-sm"
            data-testid="export-button"
            @click="handleExport"
          >
            <Icon
              name="heroicons:cloud-arrow-down"
              size="20"
            />
            Экспорт
          </button>

          <button
            v-if="budgetStore.canEdit"
            class="btn btn-ghost btn-sm"
            data-testid="import-button"
            @click="openImportModal"
          >
            <Icon
              name="heroicons:cloud-arrow-up"
              size="20"
            />
            Импорт
          </button>

          <NuxtLink
            v-if="!isOwnBudget"
            to="/budget"
            class="btn btn-outline btn-sm"
          >
            К своему бюджету
          </NuxtLink>
        </div>
      </div>

      <div class="overflow-x-auto py-6">
        <ul
          class="timeline timeline-vertical [--timeline-col-start:23ch]"
          data-testid="budget-timeline"
        >
          <BudgetTimelineAddButton
            v-if="budgetStore.canEdit"
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
            :budget-columns-sync="budgetColumnsSyncInstance"
          />

          <BudgetTimelineAddButton
            v-if="budgetStore.canEdit && !budgetStore.nextYearToLoad"
            direction="previous"
            :month-text="getPreviousMonthText()"
            :is-loading="isCreatingPreviousMonth"
            @create="handleCreatePreviousMonth"
          />

          <li v-if="budgetStore.nextYearToLoad">
            <hr>
            <div class="timeline-start">
              <button
                class="btn btn-outline btn-sm"
                :disabled="budgetStore.isLoadingYear"
                @click="handleLoadPreviousYear"
              >
                <span
                  v-if="budgetStore.isLoadingYear"
                  class="loading loading-spinner loading-xs"
                />
                <template v-else>
                  <Icon
                    name="heroicons:chevron-double-down"
                    size="16"
                  />
                  Показать {{ budgetStore.nextYearToLoad.year }} год
                </template>
                <span v-if="budgetStore.isLoadingYear">Загрузка...</span>
              </button>
            </div>
            <div class="timeline-middle">
              <div class="w-3 h-3 m-1 bg-base-300 rounded-full" />
            </div>
            <hr>
          </li>
        </ul>
      </div>
    </div>

    <BudgetImportModal
      :is-open="isImportModalOpen"
      :target-username="!isOwnBudget ? budgetStore.data?.user?.username : undefined"
      @close="closeImportModal"
      @imported="handleImported"
    />

    <BudgetEntryModal />

    <BudgetCurrencyRatesModal />

    <BudgetChartModal />
  </div>
</template>

<script setup lang="ts">
import { getCurrencyName } from '~~/shared/utils/currencies'
import { findClosestMonthForCopy } from '~~/shared/utils/month-helpers'
import { useBudgetColumnsSync } from '~/composables/useBudgetColumnsSync'
import { useBudgetStore } from '~/stores/budget'
import { useModalsStore } from '~/stores/modals'

const budgetStore = useBudgetStore()
const modalsStore = useModalsStore()
const route = useRoute()

const targetUsername = computed(() => {
  const username = Array.isArray(route.params.username)
    ? route.params.username[0]
    : route.params.username
  return username || undefined
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
const BudgetChartModal = defineAsyncComponent(() => import('~/components/budget/ChartModal.vue'))

const isOwnBudget = computed(() => budgetStore.isOwnBudget)

const groupedData = computed(() => {
  const months = budgetStore.months
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
  const nextMonth = budgetStore.getNextMonth()
  return `${monthNames[nextMonth.month]} ${nextMonth.year}`
}

const getPreviousMonthText = (): string => {
  const prevMonth = budgetStore.getPreviousMonth()
  return `${monthNames[prevMonth.month]} ${prevMonth.year}`
}

const handleCreateNextMonth = async (): Promise<void> => {
  if (!budgetStore.canEdit) return

  isCreatingNextMonth.value = true

  try {
    await budgetStore.createNextMonth()
  }
  catch (error) {
    console.error('Error creating next month:', error)
  }
  finally {
    isCreatingNextMonth.value = false
  }
}

const handleCreatePreviousMonth = async (): Promise<void> => {
  if (!budgetStore.canEdit) return

  isCreatingPreviousMonth.value = true

  try {
    await budgetStore.createPreviousMonth()
  }
  catch (error) {
    console.error('Error creating previous month:', error)
  }
  finally {
    isCreatingPreviousMonth.value = false
  }
}

const createCurrentMonth = async (): Promise<void> => {
  if (!budgetStore.canEdit) return

  isCreatingCurrentMonth.value = true

  try {
    const existingMonths = budgetStore.months || []
    const copyFromId = existingMonths.length > 0
      ? findClosestMonthForCopy(existingMonths, currentYear, currentMonth, 'previous')
      || findClosestMonthForCopy(existingMonths, currentYear, currentMonth, 'next')
      : undefined

    await budgetStore.createMonth(currentYear, currentMonth, copyFromId)
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
  try {
    await budgetStore.updateCurrency(newCurrency)
  }
  catch (error) {
    console.error('Failed to update currency:', error)
    alert('Не удалось обновить валюту. Попробуйте ещё раз.')
  }
}

const getAccessText = (access: string): string => {
  switch (access) {
    case 'owner':
      return 'Вы владелец'
    case 'read':
      return 'Только чтение'
    case 'write':
      return 'Чтение и редактирование'
    default:
      return 'Доступы неизвестны'
  }
}

const handleLoadPreviousYear = async (): Promise<void> => {
  if (!budgetStore.nextYearToLoad) return

  try {
    await budgetStore.loadYear(budgetStore.nextYearToLoad.year, targetUsername.value)
  }
  catch (error) {
    console.error('Error loading previous year:', error)
  }
}

const handleExport = async (): Promise<void> => {
  try {
    await budgetStore.exportBudget()
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
  try {
    await budgetStore.forceRefresh(targetUsername.value)
  }
  catch (error) {
    console.error('Failed to refresh budget after import:', error)
  }
}

const budgetColumnsSyncInstance = useBudgetColumnsSync()

const refreshBudget = async (username?: string) => {
  const currentUsername = budgetStore.data?.user.username
  const isChangingUser = (currentUsername && currentUsername !== username) || (!currentUsername && username)

  if (isChangingUser) {
    budgetStore.$reset()
  }

  await budgetStore.refresh(username)

  await nextTick()
  budgetColumnsSyncInstance.forceSync()
}

onMounted(async () => {
  if (import.meta.client) {
    await refreshBudget(targetUsername.value)
  }
})
</script>
