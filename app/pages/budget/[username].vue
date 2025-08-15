<template>
  <div class="min-h-screen bg-base-100 p-6">
    <div
      v-if="pending"
      class="text-center py-12"
    >
      <div class="loading loading-spinner loading-lg" />
      <p class="mt-4">
        Загрузка бюджета...
      </p>
    </div>

    <div
      v-else-if="error"
      class="text-center py-12"
    >
      <div class="text-6xl mb-4">
        ❌
      </div>
      <h2 class="text-2xl font-bold mb-2">
        Ошибка доступа
      </h2>
      <p class="text-lg opacity-70 mb-6">
        {{ error.statusMessage || 'Не удалось загрузить бюджет' }}
      </p>
      <NuxtLink
        to="/budget"
        class="btn btn-primary"
      >
        Вернуться к своему бюджету
      </NuxtLink>
    </div>

    <div
      v-else-if="budgetData"
      class="space-y-6"
    >
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-bold">
            Бюджет {{ budgetData.user.username }}
          </h1>
          <div class="flex items-center gap-2 mt-2">
            <span class="badge badge-primary">
              {{ getAccessText(budgetData.access) }}
            </span>
            <span class="text-sm opacity-70">
              Основная валюта: {{ budgetData.user.mainCurrency }}
            </span>
          </div>
        </div>
        <NuxtLink
          to="/budget"
          class="btn btn-outline"
        >
          К своему бюджету
        </NuxtLink>
      </div>

      <BudgetView
        :months-data="budgetData.months"
        :is-read-only="budgetData.access === 'read'"
        :target-username="budgetData.user.username"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { BudgetShareAccess } from '~~/server/db/schema'
import type { MonthData } from '~~/shared/types/budget'

interface BudgetUserData {
  user: {
    username: string
    mainCurrency: string
  }
  access: BudgetShareAccess | 'owner'
  months: MonthData[]
}

const route = useRoute()
const username = route.params.username as string

const { data: budgetData, pending, error } = await useFetch<BudgetUserData>(`/api/budget/user/${username}`)

const getAccessText = (access: BudgetShareAccess | 'owner'): string => {
  switch (access) {
    case 'owner':
      return 'Владелец'
    case 'read':
      return 'Только чтение'
    case 'write':
      return 'Чтение и редактирование'
    default:
      return 'Неизвестно'
  }
}

definePageMeta({
  middleware: 'auth',
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any)
</script>
