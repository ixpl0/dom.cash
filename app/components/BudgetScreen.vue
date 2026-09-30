<template>
  <div>
    <div
      v-if="budgetStore.loadError"
      class="text-center py-12"
      data-testid="budget-load-error"
    >
      <div class="text-6xl mb-4">
        ❌
      </div>
      <h2 class="text-2xl font-bold mb-2">
        {{ t('budget.accessError') }}
      </h2>
      <p class="text-lg opacity-70 mb-6">
        {{ formatError(budgetStore.loadError, t('budget.loadError')) }}
      </p>
      <button
        class="btn btn-primary"
        data-testid="load-error-own-budget-button"
        @click="navigateToOwnBudget"
      >
        {{ t('budget.backToOwnBudget') }}
      </button>
    </div>

    <div
      v-else-if="!budgetStore.data || !budgetStore.months || budgetStore.months.length === 0"
      data-testid="budget-empty-state"
    >
      <BudgetHeader
        :has-data="false"
        :is-viewing-own-budget-url="isViewingOwnBudgetUrl"
        @currency-change="saveCurrency"
        @export="handleExport"
        @import="openImportModal"
        @navigate-to-own="navigateToOwnBudget"
      />

      <div class="text-center py-12">
        <div class="mb-4 flex justify-center">
          <UiLogo class="w-16 h-16" />
        </div>
        <h2
          class="text-2xl font-bold mb-2"
          data-testid="no-budget-message"
        >
          {{ isViewingOwnBudgetUrl ? t('budget.noBudgetYet') : t('budget.noBudgetYetUser', { username: budgetStore.data?.user?.username }) }}
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
        <button
          v-else
          class="btn btn-outline btn-lg"
          @click="navigateToOwnBudget"
        >
          {{ t('budget.toOwnBudget') }}
        </button>
      </div>
    </div>

    <div v-else>
      <BudgetHeader
        :has-data="true"
        :is-viewing-own-budget-url="isViewingOwnBudgetUrl"
        @currency-change="saveCurrency"
        @export="handleExport"
        @import="openImportModal"
        @navigate-to-own="navigateToOwnBudget"
      />

      <div
        class="pt-10 pb-6 animate-fade-in-up-delayed-3"
        data-testid="budget-timeline"
      >
        <UiTimelineAddButton
          v-if="budgetStore.canEdit && canAddNextMonth"
          direction="next"
          :month-text="getNextMonthText()"
          :is-loading="isCreatingNextMonth"
          @create="handleCreateNextMonth"
        />

        <div class="overflow-x-auto px-3 sm:px-6 pt-20 pb-4 -mt-14">
          <div class="flex flex-col gap-4">
            <BudgetYear
              v-for="year in years"
              :key="year"
              :year="year"
              :months="groupedData[year] || []"
            />
          </div>
        </div>

        <UiTimelineAddButton
          v-if="budgetStore.canEdit && canAddPreviousMonth"
          direction="previous"
          :month-text="getPreviousMonthText()"
          :is-loading="isCreatingPreviousMonth"
          class="mt-2"
          @create="handleCreatePreviousMonth"
        />

        <div
          v-if="budgetStore.nextYearToLoad"
          class="flex justify-center mt-4"
        >
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

    <BudgetPlanModal />
  </div>
</template>

<script setup lang="ts">
import { findClosestMonthForCopy, isPastMonth } from '~~/shared/utils/budget/month-helpers'
import { yearSchema } from '~~/shared/schemas/budget'
import { useBudgetStore } from '~/stores/budget/budget'
import { timelineColumnsSyncKey } from '~/types/timeline'
import type { BudgetExportFormat } from '~/composables/budget/useBudgetExport'

const columnsSync = useBudgetColumnsSync()

provide(timelineColumnsSyncKey, {
  registerRow: columnsSync.registerRow,
  unregisterRow: columnsSync.unregisterRow,
})

const budgetStore = useBudgetStore()
const { exportBudget } = useBudgetExport()
const route = useRoute()
const { t } = useI18n()

const { formatError } = useServerError()
const { monthNames } = useMonthNames()
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

const isOwnBudget = computed(() => budgetStore.isOwnBudget)
const isViewingOwnBudgetUrl = computed(() => !targetUsername.value)

const lastSharedBudgetCookie = useCookie(COOKIE_NAMES.lastSharedBudget)

const navigateToOwnBudget = async (): Promise<void> => {
  lastSharedBudgetCookie.value = null
  await navigateTo('/budget')
}

const groupedData = computed(() => {
  const months = budgetStore.months
  if (!months || !Array.isArray(months)) {
    return {}
  }

  return months.reduce<Record<number, typeof months>>(
    (monthsByYear, month) => ({ ...monthsByYear, [month.year]: [...(monthsByYear[month.year] ?? []), month] }),
    {},
  )
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

const canAddNextMonth = computed((): boolean => {
  const next = budgetStore.getNextMonth()
  if (!yearSchema.safeParse(next.year).success) {
    return false
  }
  return !budgetStore.isPlanningMode || !isPastMonth(next.year, next.month)
})

const canAddPreviousMonth = computed((): boolean =>
  !budgetStore.isPlanningMode
  && !budgetStore.nextYearToLoad
  && yearSchema.safeParse(budgetStore.getPreviousMonth().year).success,
)

const getPreviousMonthText = (): string => {
  const prevMonth = budgetStore.getPreviousMonth()
  return `${monthNames.value[prevMonth.month]} ${prevMonth.year}`
}

const handleCreateNextMonth = async (): Promise<void> => {
  if (!budgetStore.canEdit) {
    return
  }

  isCreatingNextMonth.value = true

  try {
    await budgetStore.createNextMonth()
  }
  catch (error) {
    console.error('Error creating next month:', error)
    toast({ type: 'error', message: formatError(error, t('budget.toast.createNextMonthError')) })
  }
  finally {
    isCreatingNextMonth.value = false
  }
}

const handleCreatePreviousMonth = async (): Promise<void> => {
  if (!budgetStore.canEdit) {
    return
  }

  isCreatingPreviousMonth.value = true

  try {
    await budgetStore.createPreviousMonth()
  }
  catch (error) {
    console.error('Error creating previous month:', error)
    toast({ type: 'error', message: formatError(error, t('budget.toast.createPreviousMonthError')) })
  }
  finally {
    isCreatingPreviousMonth.value = false
  }
}

const createCurrentMonth = async (): Promise<void> => {
  if (!budgetStore.canEdit) {
    return
  }

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
    toast({ type: 'error', message: formatError(error, t('budget.toast.createCurrentMonthError')) })
  }
  finally {
    isCreatingCurrentMonth.value = false
  }
}

const saveCurrency = async (newCurrency: string): Promise<void> => {
  try {
    await budgetStore.updateCurrency(newCurrency)
  }
  catch (error) {
    console.error('Failed to update currency:', error)
    toast({ type: 'error', message: formatError(error, t('budget.currencyUpdateError')) })
  }
}

const handleLoadPreviousYear = async (): Promise<void> => {
  if (!budgetStore.nextYearToLoad) {
    return
  }

  try {
    await budgetStore.loadYear(budgetStore.nextYearToLoad.year)
  }
  catch (error) {
    console.error('Error loading previous year:', error)
    toast({ type: 'error', message: formatError(error, t('budget.toast.loadYearError')) })
  }
}

const handleExport = async (format: BudgetExportFormat): Promise<void> => {
  try {
    await exportBudget(format)
  }
  catch (error) {
    console.error('Export failed:', error)
    toast({ type: 'error', message: formatError(error, t('budget.exportError')) })
  }
}

const openImportModal = (): void => {
  isImportModalOpen.value = true
}

const closeImportModal = (): void => {
  isImportModalOpen.value = false
}

const handleImported = async (): Promise<void> => {
  const isRefreshed = await budgetStore.load(targetUsername.value)

  if (!isRefreshed) {
    toast({ type: 'error', message: t('budget.toast.refreshAfterImportError') })
  }
}
</script>
