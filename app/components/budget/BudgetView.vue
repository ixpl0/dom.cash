<template>
  <div>
    <div
      v-if="!monthsData || monthsData.length === 0"
      class="text-center py-12"
    >
      <div class="text-6xl mb-4">
        💰
      </div>
      <h2 class="text-2xl font-bold mb-2">
        Пока нет данных о бюджете
      </h2>
      <p class="text-lg opacity-70 mb-6">
        {{ isReadOnly ? 'Этот пользователь ещё не создал месяцы бюджета' : 'Начните с создания месяца и добавления источников баланса' }}
      </p>
      <button
        v-if="!isReadOnly"
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
    </div>

    <ul
      v-else
      class="timeline timeline-vertical [--timeline-col-start:20ch]"
    >
      <BudgetTimelineAddButton
        v-if="!isReadOnly"
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
        :all-months="monthsData ? [...monthsData] : []"
        :is-read-only="isReadOnly"
        :target-username="targetUsername"
      />

      <BudgetTimelineAddButton
        v-if="!isReadOnly"
        direction="previous"
        :month-text="getPreviousMonthText()"
        :is-loading="isCreatingPreviousMonth"
        @create="handleCreatePreviousMonth"
      />
    </ul>
  </div>
</template>

<script setup lang="ts">
import type { MonthData } from '~~/shared/types/budget'

interface Props {
  monthsData: MonthData[] | null
  isReadOnly?: boolean
  targetUsername?: string
}

const props = withDefaults(defineProps<Props>(), {
  isReadOnly: false,
  targetUsername: undefined,
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

const { createMonth, createNextMonth, createPreviousMonth, getNextMonth, getPreviousMonth } = useBudgetData(props.targetUsername)

const groupedData = computed(() => {
  const months = props.monthsData
  if (!months || !Array.isArray(months)) return {}

  return months.reduce((acc: Record<number, MonthData[]>, month) => {
    if (!acc[month.year]) {
      acc[month.year] = []
    }
    acc[month.year] = [...(acc[month.year] || []), month]
    return acc
  }, {} as Record<number, MonthData[]>)
})

const years = computed(() => {
  return Object.keys(groupedData.value)
    .map(Number)
    .sort((a, b) => b - a)
})

const getNextMonthText = (): string => {
  const nextMonth = getNextMonth()
  return `${monthNames[nextMonth.month]} ${nextMonth.year}`
}

const getPreviousMonthText = (): string => {
  const prevMonth = getPreviousMonth()
  return `${monthNames[prevMonth.month]} ${prevMonth.year}`
}

const handleCreateNextMonth = async (): Promise<void> => {
  if (props.isReadOnly) return

  isCreatingNextMonth.value = true

  try {
    await createNextMonth()
  }
  catch (error) {
    console.error('Error creating next month:', error)
  }
  finally {
    isCreatingNextMonth.value = false
  }
}

const handleCreatePreviousMonth = async (): Promise<void> => {
  if (props.isReadOnly) return

  isCreatingPreviousMonth.value = true

  try {
    await createPreviousMonth()
  }
  catch (error) {
    console.error('Error creating previous month:', error)
  }
  finally {
    isCreatingPreviousMonth.value = false
  }
}

const createCurrentMonth = async (): Promise<void> => {
  if (props.isReadOnly) return

  isCreatingCurrentMonth.value = true

  try {
    await createMonth(currentYear, currentMonth)
  }
  catch (error) {
    console.error('Error creating current month:', error)
  }
  finally {
    isCreatingCurrentMonth.value = false
  }
}
</script>
