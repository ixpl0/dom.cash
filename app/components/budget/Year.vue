<template>
  <li>
    <hr>
    <div class="timeline-start">
      <h2 class="text-3xl font-bold">
        {{ year }}
      </h2>
    </div>
    <div class="timeline-middle">
      <div class="w-3 h-3 m-1 bg-base-300 rounded-full" />
    </div>
    <div class="timeline-end flex gap-4 pl-4 py-1">
      <div
        :ref="setHeaderRef(0)"
        class="bg-base-100"
      >
        <div class="column-content w-fit whitespace-nowrap overflow-visible mx-auto text-center">
          <div
            class="text-sm text-base-content/70 font-semibold tooltip tooltip-top"
            data-tip="Сумма всех сбережений, конвертированных в основную валюту"
          >
            Баланс на начало месяца
          </div>
        </div>
      </div>

      <div
        :ref="setHeaderRef(1)"
        class="bg-base-100"
      >
        <div class="column-content w-fit whitespace-nowrap overflow-visible mx-auto text-center">
          <div
            class="text-sm text-base-content/70 font-semibold tooltip tooltip-top"
            data-tip="Сумма всех доходов, конвертированных в основную валюту"
          >
            Доходы
          </div>
        </div>
      </div>

      <div
        :ref="setHeaderRef(2)"
        class="bg-base-100"
      >
        <div class="column-content w-fit whitespace-nowrap overflow-visible mx-auto text-center">
          <div
            class="text-sm text-base-content/70 font-semibold tooltip tooltip-top"
            data-tip="Сумма всех крупных расходов, конвертированных в основную валюту"
          >
            Крупные расходы
          </div>
        </div>
      </div>

      <div
        :ref="setHeaderRef(3)"
        class="bg-base-100"
      >
        <div class="column-content w-fit whitespace-nowrap overflow-visible mx-auto text-center">
          <div
            class="text-sm text-base-content/70 font-semibold tooltip tooltip-top"
            data-tip="Баланс + Доходы - Баланс следующего месяца - Крупные расходы - Валютные колебания"
          >
            Карманные расходы
          </div>
        </div>
      </div>

      <div
        :ref="setHeaderRef(4)"
        class="bg-base-100"
      >
        <div class="column-content w-fit whitespace-nowrap overflow-visible mx-auto text-center">
          <div
            class="text-sm text-base-content/70 font-semibold tooltip tooltip-top"
            data-tip="Баланс следующего месяца минус Баланс следующего месяца, пересчитанный по курсам текущего месяца"
          >
            Валютные колебания
          </div>
        </div>
      </div>

      <div
        :ref="setHeaderRef(5)"
        class="bg-base-100"
      >
        <div class="column-content w-fit whitespace-nowrap overflow-visible mx-auto text-center">
          <div
            class="text-sm text-base-content/70 font-semibold tooltip tooltip-top"
            data-tip="Баланс на начало месяца минус Баланс предыдущего месяца"
          >
            Изменение баланса
          </div>
        </div>
      </div>
    </div>
    <hr>
  </li>

  <BudgetMonth
    v-for="monthData in months"
    :key="`${monthData.year}-${monthData.month}`"
    :month-data="monthData"
    :month-names="monthNames"
    :all-months="allMonths"
    :is-read-only="isReadOnly"
    :target-username="targetUsername"
    :main-currency="mainCurrency"
    :on-delete-month="onDeleteMonth"
    :budget-columns-sync="budgetColumnsSync"
  />
</template>

<script setup lang="ts">
import type { ComponentPublicInstance } from 'vue'
import type { MonthData } from '~~/shared/types/budget'

interface Props {
  year: number
  months: MonthData[]
  monthNames: string[]
  allMonths: MonthData[]
  isReadOnly?: boolean
  targetUsername?: string
  mainCurrency?: string
  onDeleteMonth?: (monthId: string) => Promise<void>
  budgetColumnsSync: ReturnType<typeof useBudgetColumnsSync>
}

const props = defineProps<Props>()

const headerRefs = ref<HTMLElement[]>([])

const { registerRow, unregisterRow } = props.budgetColumnsSync

const setHeaderRef = (index: number) => (el: Element | ComponentPublicInstance | null) => {
  if (el && el instanceof HTMLElement) {
    headerRefs.value[index] = el
  }
}

onMounted(() => {
  nextTick(() => {
    const validRefs = headerRefs.value.filter(Boolean)
    if (validRefs.length) {
      registerRow(validRefs)
    }
  })
})

onUnmounted(() => {
  const validRefs = headerRefs.value.filter(Boolean)
  if (validRefs.length) {
    unregisterRow(validRefs)
  }
})
</script>
