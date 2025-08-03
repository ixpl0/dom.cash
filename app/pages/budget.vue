<template>
  <div class="min-h-screen bg-base-100 p-6">
    <div
      v-if="monthsData.length === 0"
      class="text-center py-12"
    >
      <div class="text-6xl mb-4">
        💰
      </div>
      <h2 class="text-2xl font-bold mb-2">
        Пока нет данных о бюджете
      </h2>
      <p class="text-lg opacity-70 mb-6">
        Начните с создания месяца и добавления источников баланса
      </p>
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
    </div>

    <ul
      v-else
      class="timeline timeline-vertical [--timeline-col-start:15ch]"
    >
      <BudgetYear
        v-for="year in years"
        :key="year"
        :year="year"
        :months="groupedData[year]"
        :month-names="monthNames"
        :exchange-rates="exchangeRates"
      />
    </ul>
  </div>
</template>

<script setup>
const monthNames = [
  'январь', 'февраль', 'март', 'апрель', 'май', 'июнь',
  'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь',
]

const now = new Date()
const currentYear = now.getFullYear()
const currentMonth = now.getMonth()

const isCreatingCurrentMonth = ref(false)

const monthsData = ref([])

const exchangeRates = ref({
  '2024-01-01': {
    USD: 1,
    EUR: 0.85,
    RUB: 75,
  },
})

const groupedData = computed(() => {
  return monthsData.value.reduce((acc, month) => {
    if (!acc[month.year]) {
      acc[month.year] = []
    }
    acc[month.year].push(month)
    return acc
  }, {})
})

const years = computed(() => {
  return Object.keys(groupedData.value)
    .map(Number)
    .sort((a, b) => b - a)
})

const createCurrentMonth = async () => {
  isCreatingCurrentMonth.value = true

  try {
    await new Promise(resolve => setTimeout(resolve, 1000))

    const newMonth = {
      id: `month-${Date.now()}`,
      year: currentYear,
      month: currentMonth,
      userMonthId: `user-month-${Date.now()}`,
      balanceSources: [],
      incomeEntries: [],
      expenseEntries: [],
      balanceChange: 0,
      pocketExpenses: 0,
      income: 0,
    }

    monthsData.value.push(newMonth)
  }
  catch (error) {
    console.error('Error creating current month:', error)
  }
  finally {
    isCreatingCurrentMonth.value = false
  }
}
</script>
