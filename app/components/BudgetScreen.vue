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
        {{ t('budget.accessError') }}
      </h2>
      <p class="text-lg opacity-70 mb-6">
        {{ budgetStore.error || t('budget.loadError') }}
      </p>
      <NuxtLink
        to="/budget"
        class="btn btn-primary"
      >
        {{ t('budget.backToOwnBudget') }}
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
        {{ t('budget.noBudgetYet') }}
      </h2>
      <p class="text-lg opacity-70 mb-6">
        {{ !budgetStore.canEdit ? t('budget.userNoMonths') : t('budget.startWithMonth') }}
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
            {{ t('budget.createFirstMonth') }} {{ monthNames[currentMonth] }} {{ currentYear }}
          </span>
          <span v-else>{{ t('budget.creatingMonth') }}</span>
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
          {{ t('budget.importBudget') }}
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
          {{ t('budget.title') }}
        </h1>

        <div class="flex items-center flex-wrap gap-2 flex-col sm:flex-row w-full sm:w-auto">
          <span
            v-if="budgetStore.data?.access !== 'owner'"
            class="badge w-full sm:w-auto"
          >
            {{ t('budget.access.ownerOf') }}
            {{ budgetStore.data?.user.username }}
          </span>
          <span class="badge w-full sm:w-auto">
            {{ getAccessText(budgetStore.data?.access || 'unknown') }}
          </span>
          <UiCurrencyPicker
            v-if="budgetStore.canEdit"
            :model-value="budgetStore.data?.user.mainCurrency"
            :placeholder="t('budget.mainCurrency')"
            class="w-full sm:w-70"
            @change="saveCurrency"
          />
          <span
            v-else
            class="opacity-70 text-sm"
          >
            {{ t('budget.mainCurrencyLabel') }}
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
            {{ t('budget.chart') }}
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
            {{ t('budget.export') }}
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
            {{ t('budget.import') }}
          </button>

          <NuxtLink
            v-if="!isOwnBudget"
            to="/budget"
            class="btn btn-outline btn-sm"
          >
            {{ t('budget.toOwnBudget') }}
          </NuxtLink>
        </div>
      </div>

      <div class="overflow-x-auto py-6">
        <UiTimeline
          class="[--timeline-col-start:23ch]"
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
                  {{ t('budget.showYear') }} {{ budgetStore.nextYearToLoad.year }} {{ t('budget.yearWord') }}
                </template>
                <span v-if="budgetStore.isLoadingYear">{{ t('common.loading') }}</span>
              </button>
            </div>
            <div class="timeline-middle">
              <div class="w-3 h-3 m-1 bg-base-300 rounded-full" />
            </div>
            <hr>
          </li>
        </UiTimeline>
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
import { getErrorMessage } from '~~/shared/utils/errors'
import { findClosestMonthForCopy } from '~~/shared/utils/month-helpers'
import { useBudgetStore } from '~/stores/budget'
import { useModalsStore } from '~/stores/modals'

const budgetStore = useBudgetStore()
const modalsStore = useModalsStore()
const route = useRoute()
const { t } = useI18n()
const { monthNames } = useMonthNames()
const { getCurrencyName } = useCurrencies()
const { toast } = useToast()

const targetUsername = computed(() => {
  const username = Array.isArray(route.params.username)
    ? route.params.username[0]
    : route.params.username
  return username || undefined
})

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
  return `${monthNames.value[nextMonth.month]} ${nextMonth.year}`
}

const getPreviousMonthText = (): string => {
  const prevMonth = budgetStore.getPreviousMonth()
  return `${monthNames.value[prevMonth.month]} ${prevMonth.year}`
}

const handleCreateNextMonth = async (): Promise<void> => {
  if (!budgetStore.canEdit) return

  isCreatingNextMonth.value = true

  try {
    await budgetStore.createNextMonth()
  }
  catch (error) {
    console.error('Error creating next month:', error)
    toast({ type: 'error', message: getErrorMessage(error, t('budget.toast.createNextMonthError')) })
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
    toast({ type: 'error', message: getErrorMessage(error, t('budget.toast.createPreviousMonthError')) })
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
    toast({ type: 'error', message: getErrorMessage(error, t('budget.toast.createCurrentMonthError')) })
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
    toast({ type: 'error', message: getErrorMessage(error, t('budget.currencyUpdateError')) })
  }
}

const getAccessText = (access: string): string => {
  switch (access) {
    case 'owner':
      return t('budget.access.owner')
    case 'read':
      return t('budget.access.read')
    case 'write':
      return t('budget.access.write')
    default:
      return t('budget.access.unknown')
  }
}

const handleLoadPreviousYear = async (): Promise<void> => {
  if (!budgetStore.nextYearToLoad) return

  try {
    await budgetStore.loadYear(budgetStore.nextYearToLoad.year, targetUsername.value)
  }
  catch (error) {
    console.error('Error loading previous year:', error)
    toast({ type: 'error', message: getErrorMessage(error, t('budget.toast.loadYearError')) })
  }
}

const handleExport = async (): Promise<void> => {
  try {
    await budgetStore.exportBudget()
  }
  catch (error) {
    console.error('Export failed:', error)
    toast({ type: 'error', message: getErrorMessage(error, t('budget.exportError')) })
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
    toast({ type: 'error', message: getErrorMessage(error, t('budget.toast.refreshAfterImportError')) })
  }
}

const refreshBudget = async (username?: string) => {
  const currentUsername = budgetStore.data?.user.username
  const isChangingUser = (currentUsername && currentUsername !== username) || (!currentUsername && username)

  if (isChangingUser) {
    budgetStore.$reset()
  }

  await budgetStore.refresh(username)
}

onMounted(async () => {
  if (import.meta.client) {
    await refreshBudget(targetUsername.value)
  }
})
</script>
