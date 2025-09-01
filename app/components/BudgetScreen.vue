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
    >
      <div class="text-6xl mb-4">
        💰
      </div>
      <h2 class="text-2xl font-bold mb-2">
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
        <h1 class="text-3xl font-bold">
          Бюджет
        </h1>
        <div class="flex items-center gap-2 mt-2">
          <span class="badge badge-primary badge-outline">
            Бюджет
            {{ budgetStore.data?.user.username }}
          </span>
          <span class="badge badge-secondary badge-outline">
            {{ getAccessText(budgetStore.data?.access || 'unknown') }}
          </span>
          <UiCurrencyPicker
            v-if="budgetStore.canEdit"
            :model-value="budgetStore.data?.user.mainCurrency"
            placeholder="Основная валюта"
            class="w-70"
            @change="saveCurrency"
          />
          <span
            v-else
            class="opacity-70 text-sm"
          >
            Основная валюта: {{ getCurrencyDisplayText(budgetStore.data?.user.mainCurrency || '') }}
          </span>
        </div>
        <div class="flex gap-2">
          <div
            v-if="budgetStore.canEdit"
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
            class="btn btn-outline btn-sm"
          >
            К своему бюджету
          </NuxtLink>
        </div>
      </div>

      <ul class="timeline timeline-vertical [--timeline-col-start:20ch]">
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
          v-if="budgetStore.canEdit"
          direction="previous"
          :month-text="getPreviousMonthText()"
          :is-loading="isCreatingPreviousMonth"
          @create="handleCreatePreviousMonth"
        />
      </ul>
    </div>

    <BudgetImportModal
      :is-open="isImportModalOpen"
      :target-username="!isOwnBudget ? budgetStore.data?.user?.username : undefined"
      @close="closeImportModal"
      @imported="handleImported"
    />

    <BudgetEntryModal />

    <BudgetCurrencyRatesModal />
  </div>
</template>

<script setup lang="ts">
import { getCurrencyName } from '~~/shared/utils/currencies'
import { useBudgetColumnsSync } from '~/composables/useBudgetColumnsSync'
import { useBudgetStore } from '~/stores/budget'

const budgetStore = useBudgetStore()
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
    await budgetStore.createMonth(currentYear, currentMonth)
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
    await budgetStore.refresh(targetUsername.value)
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
