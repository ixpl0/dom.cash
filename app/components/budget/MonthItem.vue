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
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
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
              {{ formatAmount(startBalance, baseCurrency) }}
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
            data-tip="Всё, что осталось после вычета крупных расходов из общих расходов. Это деньги на еду, оплату подписок, мелкие покупки и т.д."
          >
            <button
              class="btn btn-ghost text-[2rem] font-extrabold"
              :class="getBalanceChangeClass(monthData.balanceChange)"
              disabled
            >
              {{ formatAmount(monthData.balanceChange, baseCurrency) }}
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
              {{ formatAmount(totalIncome, baseCurrency) }}
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
              {{ formatAmount(totalExpenses, baseCurrency) }}
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
            class="tooltip tooltip-left font-normal"
            data-tip="Всё, что осталось после вычета крупных расходов из общих расходов. Это деньги на еду, оплату подписок, мелкие покупки и т.д."
          >
            <button
              class="btn btn-ghost text-[2rem] font-extrabold"
              :class="getPocketExpensesClass(monthData.pocketExpenses, monthData.income)"
              disabled
            >
              {{ formatAmount(monthData.pocketExpenses, baseCurrency) }}
            </button>
          </div>
        </div>
      </div>
    </div>
    <hr>
  </li>
</template>

<script setup lang="ts">
import type { MonthData } from '~~/shared/types/budget'
import { formatAmount, getBalanceChangeClass, getPocketExpensesClass, calculateTotalBalance } from '~~/shared/utils/budget'

interface Props {
  monthData: MonthData
  monthNames: string[]
  exchangeRates: Record<string, number>
  baseCurrency: string
}

const props = defineProps<Props>()

const startBalance = computed(() =>
  calculateTotalBalance(props.monthData.balanceSources, props.baseCurrency, props.exchangeRates),
)

const totalIncome = computed(() =>
  calculateTotalBalance(
    props.monthData.incomeEntries.map(entry => ({
      id: entry.id,
      name: entry.description,
      currency: entry.currency,
      amount: entry.amount,
    })),
    props.baseCurrency,
    props.exchangeRates,
  ),
)

const totalExpenses = computed(() =>
  calculateTotalBalance(
    props.monthData.expenseEntries.map(entry => ({
      id: entry.id,
      name: entry.description,
      currency: entry.currency,
      amount: entry.amount,
    })),
    props.baseCurrency,
    props.exchangeRates,
  ),
)

const openBalanceModal = () => {
  console.log('Opening balance modal for', props.monthData.userMonthId)
}

const openIncomeModal = () => {
  console.log('Opening income modal for', props.monthData.userMonthId)
}

const openExpenseModal = () => {
  console.log('Opening expense modal for', props.monthData.userMonthId)
}
</script>
