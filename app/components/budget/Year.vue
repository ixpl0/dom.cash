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
  />
</template>

<script setup lang="ts">
import type { MonthData } from '~~/shared/types/budget'

interface Props {
  year: number
  months: MonthData[]
  monthNames: string[]
  allMonths: MonthData[]
  isReadOnly?: boolean
  targetUsername?: string
  mainCurrency?: string
}
defineProps<Props>()
</script>
