<template>
  <div class="min-h-screen bg-base-100">
    <section class="hero min-h-[60vh]">
      <div class="hero-content text-center py-16">
        <div class="max-w-2xl animate-fade-in">
          <div class="flex items-center justify-center gap-4 mb-6">
            <UiLogo class="w-13 h-13 animate-bounce-slow" />
            <h1
              class="text-5xl md:text-6xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent"
              data-testid="home-title"
            >
              {{ t('home.title') }}
            </h1>
          </div>

          <p
            class="text-xl md:text-2xl opacity-70 mb-8"
            data-testid="home-subtitle"
          >
            {{ t('home.subtitle') }}
          </p>

          <p
            class="text-lg opacity-60 mb-10 max-w-lg mx-auto"
            data-testid="home-description"
          >
            {{ t('home.description') }}
          </p>

          <div class="flex flex-col sm:flex-row gap-4 justify-center">
            <template v-if="isAuthenticated">
              <NuxtLink
                to="/budget"
                class="btn btn-primary btn-lg gap-2 shadow-lg hover:shadow-xl transition-shadow"
                data-testid="go-to-budget-btn"
              >
                <Icon
                  name="heroicons:rocket-launch"
                  size="24"
                />
                {{ t('home.goToBudget') }}
              </NuxtLink>
              <NuxtLink
                to="/todo"
                class="btn btn-outline btn-lg gap-2"
                data-testid="go-to-todo-btn"
              >
                <Icon
                  name="heroicons:document-text"
                  size="24"
                />
                {{ t('home.goToTodo') }}
              </NuxtLink>
              <NuxtLink
                to="/docs"
                class="btn btn-outline btn-lg gap-2"
                data-testid="go-to-docs-btn"
              >
                <Icon
                  name="heroicons:identification"
                  size="24"
                />
                {{ t('home.goToDocs') }}
              </NuxtLink>
            </template>

            <template v-else>
              <NuxtLink
                to="/auth"
                class="btn btn-primary btn-lg gap-2 shadow-lg hover:shadow-xl transition-shadow"
                data-testid="hero-register-btn"
              >
                <Icon
                  name="heroicons:rocket-launch"
                  size="24"
                />
                {{ t('home.getStarted') }}
              </NuxtLink>

              <NuxtLink
                to="/auth"
                class="btn btn-outline btn-lg gap-2"
                data-testid="hero-login-btn"
              >
                <Icon
                  name="heroicons:arrow-right-on-rectangle"
                  size="24"
                />
                {{ t('home.login') }}
              </NuxtLink>
            </template>
          </div>
        </div>
      </div>
    </section>

    <section class="py-16 px-4 bg-base-200">
      <div class="max-w-7xl mx-auto">
        <h2
          v-animate-on-scroll="'animate-fade-in'"
          class="text-3xl font-bold text-center mb-4"
          data-testid="demo-title"
        >
          {{ t('home.demoTitle') }}
        </h2>
        <p
          v-animate-on-scroll="{ animation: 'animate-fade-in', delay: 100 }"
          class="text-center opacity-60 mb-12 max-w-xl mx-auto"
          data-testid="demo-subtitle"
        >
          {{ t('home.demoSubtitle') }}
        </p>

        <div
          v-animate-on-scroll="{ animation: 'animate-slide-up', delay: 200 }"
          class="overflow-x-auto"
        >
          <UiTimeline class="[--timeline-col-start:12ch] pointer-events-none select-none">
            <UiYear
              :year="demoData.year"
              :stats="demoData.yearStats"
              :format-amount="formatDemoAmount"
              :amount-sign="getDemoAmountSign"
            >
              <UiMonth
                v-for="(month, index) in demoData.months"
                :key="index"
                :month-name="monthNames[month.monthIndex] ?? ''"
                :month-badge-tooltip="month.tooltip"
                :balance-tooltip="t('home.demo.balanceTooltip')"
                :income-tooltip="t('home.demo.incomeTooltip')"
                :expenses-tooltip="t('home.demo.expensesTooltip')"
                :pocket-expenses-tooltip="t('home.demo.pocketExpensesTooltip')"
                :total-expenses-tooltip="t('home.demo.totalExpensesTooltip')"
                :balance-change-tooltip="t('home.demo.balanceChangeTooltip')"
                :currency-fluctuation-tooltip="t('home.demo.currencyTooltip')"
                :optional-expenses-tooltip="t('home.demo.optionalTooltip')"
                :data="month.data"
                :is-current-month="index === 0"
                :is-read-only="true"
                :can-open-entries="false"
                :can-delete="false"
                :format-amount="formatDemoAmount"
                :amount-sign="getDemoAmountSign"
              />
            </UiYear>
          </UiTimeline>
        </div>
      </div>
    </section>

    <section class="py-16 px-4">
      <div class="max-w-5xl mx-auto">
        <h2
          v-animate-on-scroll="'animate-fade-in'"
          class="text-3xl font-bold text-center mb-4"
          data-testid="demo-chart-title"
        >
          {{ t('home.demoChartTitle') }}
        </h2>
        <p
          v-animate-on-scroll="{ animation: 'animate-fade-in', delay: 100 }"
          class="text-center opacity-60 mb-12 max-w-xl mx-auto"
          data-testid="demo-chart-subtitle"
        >
          {{ t('home.demoChartSubtitle') }}
        </p>

        <div
          v-animate-on-scroll="{ animation: 'animate-slide-up', delay: 200 }"
          class="pointer-events-none select-none"
        >
          <UiChart chart-height="400px">
            <ClientOnly>
              <BudgetChartClient
                :option="demoChartOption"
              />
              <template #fallback>
                <div class="flex items-center justify-center h-full">
                  <span class="loading loading-spinner loading-lg" />
                </div>
              </template>
            </ClientOnly>
          </UiChart>
        </div>
      </div>
    </section>

    <section class="py-16 px-4 bg-base-200">
      <div class="max-w-4xl mx-auto">
        <h2
          v-animate-on-scroll="'animate-fade-in'"
          class="text-3xl font-bold text-center mb-4"
          data-testid="demo-entries-title"
        >
          {{ t('home.demoEntriesTitle') }}
        </h2>
        <p
          v-animate-on-scroll="{ animation: 'animate-fade-in', delay: 100 }"
          class="text-center opacity-60 mb-12 max-w-xl mx-auto"
          data-testid="demo-entries-subtitle"
        >
          {{ t('home.demoEntriesSubtitle') }}
        </p>

        <div
          v-animate-on-scroll="{ animation: 'animate-slide-up', delay: 200 }"
          class="pointer-events-none select-none"
        >
          <UiEntryTable
            :entries="demoEntries"
            :entry-kind="'expense'"
            :format-date="formatDemoDate"
          />
        </div>
      </div>
    </section>

    <section class="pt-16 pb-40 px-4">
      <div class="max-w-4xl mx-auto text-center">
        <h2
          v-animate-on-scroll="'animate-fade-in'"
          class="text-3xl font-bold mb-8"
          data-testid="cta-title"
        >
          {{ t('home.ctaTitle') }}
        </h2>

        <div class="grid md:grid-cols-3 gap-6 mb-12">
          <div
            v-animate-on-scroll="{ animation: 'animate-fade-in', delay: 100 }"
            class="card bg-base-200 shadow-lg"
          >
            <div class="card-body items-center text-center">
              <Icon
                name="heroicons:chart-bar"
                size="48"
                class="text-primary mb-4"
              />
              <h3 class="card-title">
                {{ t('home.feature1Title') }}
              </h3>
              <p class="opacity-70">
                {{ t('home.feature1Desc') }}
              </p>
            </div>
          </div>

          <div
            v-animate-on-scroll="{ animation: 'animate-fade-in', delay: 200 }"
            class="card bg-base-200 shadow-lg"
          >
            <div class="card-body items-center text-center">
              <Icon
                name="heroicons:currency-dollar"
                size="48"
                class="text-secondary mb-4"
              />
              <h3 class="card-title">
                {{ t('home.feature2Title') }}
              </h3>
              <p class="opacity-70">
                {{ t('home.feature2Desc') }}
              </p>
            </div>
          </div>

          <div
            v-animate-on-scroll="{ animation: 'animate-fade-in', delay: 300 }"
            class="card bg-base-200 shadow-lg"
          >
            <div class="card-body items-center text-center">
              <Icon
                name="heroicons:users"
                size="48"
                class="text-accent mb-4"
              />
              <h3 class="card-title">
                {{ t('home.feature3Title') }}
              </h3>
              <p class="opacity-70">
                {{ t('home.feature3Desc') }}
              </p>
            </div>
          </div>
        </div>

        <div
          v-animate-on-scroll="{ animation: 'animate-fade-in', delay: 400 }"
          class="flex flex-col sm:flex-row gap-4 justify-center"
        >
          <NuxtLink
            :to="isAuthenticated ? '/budget' : '/auth'"
            class="btn btn-primary btn-lg gap-2 shadow-lg hover:shadow-xl transition-shadow"
            data-testid="cta-register-btn"
          >
            <Icon
              name="heroicons:rocket-launch"
              size="24"
            />
            {{ isAuthenticated ? t('home.goToBudget') : t('home.getStarted') }}
          </NuxtLink>
          <NuxtLink
            v-if="isAuthenticated"
            to="/todo"
            class="btn btn-outline btn-lg gap-2"
            data-testid="cta-todo-btn"
          >
            <Icon
              name="heroicons:document-text"
              size="24"
            />
            {{ t('home.goToTodo') }}
          </NuxtLink>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import type { UiMonthData } from '~/components/ui/Month.vue'
import type { UiYearStats } from '~/components/ui/Year.vue'
import type { EntryTableEntry } from '~/components/ui/EntryTable.vue'
import type { ChartOption, ChartSeriesConfig } from '~/composables/shared/useChartConfig'
import { formatPlainDate } from '~~/shared/utils/shared/dates'

const BudgetChartClient = defineAsyncComponent(() => import('~/components/budget/BudgetChartClient.client.vue'))

const { t, locale } = useI18n()
const { formatMoneyRounded, getRoundedMoneySign } = useMoneyFormat()
const { monthNames } = useMonthNames()
const { isAuthenticated } = useAuthState()

const DEMO_CURRENCY = 'USD'
const DEMO_CHART_MONTHS = 6

const formatDemoAmount = (amount: number): string => {
  return formatMoneyRounded(amount, DEMO_CURRENCY)
}

const getDemoAmountSign = (amount: number): number => getRoundedMoneySign(amount, DEMO_CURRENCY)

interface DemoMonth {
  monthIndex: number
  tooltip: string
  data: UiMonthData
}

interface DemoData {
  year: number
  yearStats: UiYearStats
  months: DemoMonth[]
}

const demoData = computed((): DemoData => {
  const currentDate = new Date()
  const currentMonth = currentDate.getMonth()
  const currentYear = currentDate.getFullYear()

  const months: DemoMonth[] = [
    {
      monthIndex: currentMonth,
      tooltip: `${monthNames.value[currentMonth]} ${currentYear}`,
      data: {
        startBalance: 25400,
        totalIncome: 8500,
        totalExpenses: 3200,
        totalOptionalExpenses: 450,
        calculatedPocketExpenses: 2100,
        totalAllExpenses: 5300,
        calculatedBalanceChange: 3200,
        currencyProfitLoss: 120,
        plannedBalanceChange: null,
        plannedVsActualDiff: null,
        expectedBalance: null,
        planComment: null,
      },
    },
    {
      monthIndex: currentMonth > 0 ? currentMonth - 1 : 11,
      tooltip: `${monthNames.value[currentMonth > 0 ? currentMonth - 1 : 11]} ${currentMonth > 0 ? currentYear : currentYear - 1}`,
      data: {
        startBalance: 22200,
        totalIncome: 8200,
        totalExpenses: 2800,
        totalOptionalExpenses: 380,
        calculatedPocketExpenses: 1950,
        totalAllExpenses: 4750,
        calculatedBalanceChange: 3450,
        currencyProfitLoss: -85,
        plannedBalanceChange: null,
        plannedVsActualDiff: null,
        expectedBalance: null,
        planComment: null,
      },
    },
    {
      monthIndex: currentMonth > 1 ? currentMonth - 2 : (currentMonth === 1 ? 11 : 10),
      tooltip: `${monthNames.value[currentMonth > 1 ? currentMonth - 2 : (currentMonth === 1 ? 11 : 10)]} ${currentMonth > 1 ? currentYear : currentYear - 1}`,
      data: {
        startBalance: 18750,
        totalIncome: 8000,
        totalExpenses: 3500,
        totalOptionalExpenses: 520,
        calculatedPocketExpenses: 2250,
        totalAllExpenses: 5750,
        calculatedBalanceChange: 2250,
        currencyProfitLoss: 45,
        plannedBalanceChange: null,
        plannedVsActualDiff: null,
        expectedBalance: null,
        planComment: null,
      },
    },
  ]

  const yearStats: UiYearStats = {
    averageBalance: 22117,
    totalIncome: 24700,
    averageIncome: 8233,
    totalExpenses: 9500,
    averageExpenses: 3167,
    totalOptionalExpenses: 1350,
    averageOptionalExpenses: 450,
    totalPocketExpenses: 6300,
    averagePocketExpenses: 2100,
    totalAllExpenses: 15800,
    averageAllExpenses: 5267,
    totalBalanceChange: 8900,
    averageBalanceChange: 2967,
    totalCurrencyProfitLoss: 80,
    averageCurrencyProfitLoss: 27,
    totalPlannedBalanceChange: 0,
    totalPlannedVsActualDiff: 0,
    plannedMonthCount: 0,
    plannedDiffMonthCount: 0,
    endOfYearExpectedBalance: null,
  }

  return {
    year: currentYear,
    yearStats,
    months,
  }
})

const demoChartLabels = computed(() => {
  const currentDate = new Date()

  return Array.from({ length: DEMO_CHART_MONTHS }, (_, index) => {
    const monthsAgo = DEMO_CHART_MONTHS - 1 - index
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - monthsAgo, 1)
    return `${monthNames.value[date.getMonth()]} ${date.getFullYear()}`
  })
})

const demoChartData = {
  balance: [2000, 5800, 9500, 13700, 17200, 21000],
  income: [4800, 7200, 5500, 8100, 8800, 11200],
  expenses: [7500, 5200, 7800, 5600, 5800, 4900],
}

const demoChartSeriesConfigs = computed((): ReadonlyArray<ChartSeriesConfig> => [
  { name: t('chart.balance'), data: demoChartData.balance, colorKey: 'primary', type: 'line' },
  { name: t('chart.income'), data: demoChartData.income, colorKey: 'success', type: 'bar' },
  { name: t('chart.expenses'), data: demoChartData.expenses, colorKey: 'error', type: 'bar' },
])

const { colors: themeColors } = useChartTheme()

const demoChartOption = computed((): ChartOption => {
  return buildChartOption({
    colors: themeColors.value,
    labels: demoChartLabels.value,
    series: demoChartSeriesConfigs.value,
    yAxisFormatter: (value: number) => formatMoneyRounded(value, DEMO_CURRENCY),
  })
})

const demoEntries = computed((): EntryTableEntry[] => {
  const currentDate = new Date()
  const currentYear = currentDate.getFullYear()
  const currentMonth = currentDate.getMonth()

  return [
    {
      id: '1',
      description: t('home.demoEntry.rent'),
      amount: 1500,
      currency: 'USD',
      date: `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`,
      isOptional: false,
    },
    {
      id: '2',
      description: t('home.demoEntry.utilities'),
      amount: 180,
      currency: 'USD',
      date: `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-05`,
      isOptional: false,
    },
    {
      id: '3',
      description: t('home.demoEntry.subscription'),
      amount: 15,
      currency: 'USD',
      date: `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-10`,
      isOptional: true,
    },
    {
      id: '4',
      description: t('home.demoEntry.insurance'),
      amount: 350,
      currency: 'USD',
      date: `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-15`,
      isOptional: false,
    },
  ]
})

const formatDemoDate = (date: string | null | undefined): string => {
  if (!date) {
    return ''
  }
  return formatPlainDate(date, locale.value, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}
</script>

<style scoped>
@keyframes fade-in {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes slide-up {
  from {
    opacity: 0;
    transform: translateY(40px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes bounce-slow {
  0% {
    transform: translateY(5px) scaleY(0.9) scaleX(1.1);
    animation-timing-function: ease-out;
  }
  12% {
    transform: translateY(-5px) scaleY(1.1) scaleX(0.9);
    animation-timing-function: ease-out;
  }
  45% {
    transform: translateY(-25px) scaleY(1) scaleX(1);
    animation-timing-function: ease-in;
  }
  94% {
    transform: translateY(5px) scaleY(1) scaleX(1);
    animation-timing-function: linear;
  }
  100% {
    transform: translateY(5px) scaleY(0.9) scaleX(1.1);
  }
}

.animate-fade-in {
  animation: fade-in 0.6s ease-out both;
}

.animate-slide-up {
  animation: slide-up 0.8s ease-out both;
}

.animate-bounce-slow {
  animation: bounce-slow 1.5s ease-in-out infinite;
}
</style>
