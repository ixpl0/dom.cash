<template>
  <li>
    <hr>
    <div class="timeline-start">
      <h2 class="text-3xl font-bold">
        {{ year }}
      </h2>
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
    <hr>
  </li>

  <BudgetMonth
    v-for="monthData in months"
    :key="`${monthData.year}-${monthData.month}`"
    :month-data="monthData"
    :month-names="monthNames"
    :all-months="allMonths"
  />
</template>

<script setup lang="ts">
import type { MonthData } from '~~/shared/types/budget'

interface Props {
  year: number
  months: MonthData[]
  monthNames: string[]
  allMonths: MonthData[]
}
defineProps<Props>()
</script>
