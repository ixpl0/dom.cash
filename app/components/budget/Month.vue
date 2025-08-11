<template>
  <li>
    <hr>
    <div class="timeline-start">
      <div
        class="tooltip capitalize"
        :data-tip="`${monthNames[monthData.month]} ${monthData.year}`"
      >
        <div class="badge badge-ghost badge-lg uppercase">
          {{ monthNames[monthData.month] }}
        </div>
      </div>
    </div>

    <div class="timeline-middle">
      <svg
        class="h-5 w-5"
        viewBox="0 0 20 20"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          clip-rule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
          fill="currentColor"
          fill-rule="evenodd"
        />
      </svg>
    </div>

    <div class="timeline-end stats shadow">
      <div class="stat place-items-center">
        <div class="stat-title">
          Баланс на начало месяца
        </div>
        <div class="stat-value text-primary">
          <div
            class="tooltip tooltip-right font-normal"
            :data-tip="`Сумма всех сбережений на начало месяца. Этого хватило бы на ${Math.floor(startBalance / 3500)} мес`"
          >
            <button
              class="btn btn-ghost text-[2rem] font-extrabold"
              @click="openBalanceModal"
            >
              {{ formatAmount(startBalance, mainCurrency) }}
            </button>
          </div>
        </div>
      </div>

      <div class="stat place-items-center">
        <div class="stat-title text-center">
          Изменение баланса
        </div>
        <div class="stat-value">
          <div
            class="tooltip tooltip-right font-normal"
            data-tip="Разница между доходами и расходами за месяц"
          >
            <button
              class="btn btn-ghost text-[2rem] font-extrabold"
              :class="getBalanceChangeClass(balanceChange)"
              disabled
            >
              {{ formatAmount(balanceChange, mainCurrency) }}
            </button>
          </div>
        </div>
      </div>

      <div class="stat place-items-center">
        <div class="stat-title">
          Доходы
        </div>
        <div class="stat-value text-success">
          <div
            class="tooltip tooltip-left font-normal"
            :data-tip="`Все доходы за ${monthNames[monthData.month]} ${monthData.year}. Это зарплата, бонусы, подарки и т.д.`"
          >
            <button
              class="btn btn-ghost text-[2rem] font-extrabold"
              @click="openIncomeModal"
            >
              {{ formatAmount(totalIncome, mainCurrency) }}
            </button>
          </div>
        </div>
      </div>

      <div class="stat place-items-center">
        <div class="stat-title">
          Крупные расходы
        </div>
        <div class="stat-value text-error">
          <div
            class="tooltip tooltip-left font-normal"
            :data-tip="`Все крупные расходы за ${monthNames[monthData.month]} ${monthData.year}. Это оплата квартиры, покупка техники, путешествия и т.д.`"
          >
            <button
              class="btn btn-ghost text-[2rem] font-extrabold"
              @click="openExpenseModal"
            >
              {{ formatAmount(totalExpenses, mainCurrency) }}
            </button>
          </div>
        </div>
      </div>

      <div class="stat place-items-center">
        <div class="stat-title text-center">
          Карманные расходы
        </div>
        <div class="stat-value">
          <div
            v-if="pocketExpenses !== null"
            class="tooltip tooltip-left font-normal"
            data-tip="Всё, что осталось после вычета крупных расходов из общих расходов. Это деньги на еду, оплату подписок, мелкие покупки и т.д."
          >
            <button
              class="btn btn-ghost text-[2rem] font-extrabold"
              :class="getPocketExpensesClass(pocketExpenses, totalIncome)"
              disabled
            >
              {{ formatAmount(pocketExpenses, mainCurrency) }}
            </button>
          </div>
          <div
            v-else
            class="tooltip tooltip-left font-normal"
            data-tip="Будет доступно после появления баланса следующего месяца"
          >
            <button
              class="btn btn-ghost text-[2rem] font-extrabold text-base-content/50"
              disabled
            >
              —
            </button>
          </div>
        </div>
      </div>
    </div>

    <BudgetEntryModal
      ref="balanceModal"
      :month-id="monthData.id"
      entry-kind="balance"
      :entries="monthData.balanceSources || []"
    />

    <BudgetEntryModal
      ref="incomeModal"
      :month-id="monthData.id"
      entry-kind="income"
      :entries="monthData.incomeEntries || []"
    />

    <BudgetEntryModal
      ref="expenseModal"
      :month-id="monthData.id"
      entry-kind="expense"
      :entries="monthData.expenseEntries || []"
    />

    <hr>
  </li>
</template>

<script setup lang="ts">
import type { MonthData } from '~~/shared/types/budget'
import { formatAmount, calculateTotalBalance, getBalanceChangeClass, getPocketExpensesClass } from '~~/shared/utils/budget'

interface Props {
  monthData: MonthData
  monthNames: string[]
  nextMonthBalance?: number | null
  allMonths: MonthData[]
}

const props = defineProps<Props>()

const { mainCurrency } = useUser()
const balanceModal = ref()
const incomeModal = ref()
const expenseModal = ref()

const currentMonthRates = computed(() => {
  return props.monthData.exchangeRates || { USD: 1, EUR: 0.85, RUB: 95 }
})

const startBalance = computed(() => {
  return calculateTotalBalance(
    props.monthData.balanceSources,
    mainCurrency.value,
    currentMonthRates.value,
  )
})

const totalIncome = computed(() => {
  return calculateTotalBalance(
    props.monthData.incomeEntries,
    mainCurrency.value,
    currentMonthRates.value,
  )
})

const totalExpenses = computed(() => {
  return calculateTotalBalance(
    props.monthData.expenseEntries,
    mainCurrency.value,
    currentMonthRates.value,
  )
})

const balanceChange = computed(() => {
  return totalIncome.value - totalExpenses.value
})

const nextMonthData = computed(() => {
  const nextMonth = props.monthData.month === 11 ? 0 : props.monthData.month + 1
  const nextYear = props.monthData.month === 11 ? props.monthData.year + 1 : props.monthData.year

  return props.allMonths.find(m => m.year === nextYear && m.month === nextMonth)
})

const nextMonthStartBalance = computed(() => {
  if (!nextMonthData.value) {
    return null
  }

  const nextMonthRates = nextMonthData.value.exchangeRates || { USD: 1, EUR: 0.85, RUB: 95 }

  return calculateTotalBalance(
    nextMonthData.value.balanceSources,
    mainCurrency.value,
    nextMonthRates,
  )
})

const pocketExpenses = computed(() => {
  if (nextMonthStartBalance.value === null) {
    return null
  }

  return startBalance.value + totalIncome.value - totalExpenses.value - nextMonthStartBalance.value
})

const openBalanceModal = (): void => {
  balanceModal.value?.show()
}

const openIncomeModal = (): void => {
  incomeModal.value?.show()
}

const openExpenseModal = (): void => {
  expenseModal.value?.show()
}
</script>
