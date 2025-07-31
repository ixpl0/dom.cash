<template>
  <div class="space-y-6">
    <div class="text-center">
      <h1 class="text-4xl font-bold mb-4">
        Управление бюджетом
      </h1>
      <p class="text-lg text-base-content/70">
        Контролируйте свои доходы и расходы
      </p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div class="card bg-base-200 shadow-xl">
        <div class="card-body">
          <h2 class="card-title text-success">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" viewBox="0 0 24 24" stroke="currentColor">
              <path fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Доходы
          </h2>
          <p class="text-3xl font-bold text-success">₽ 0</p>
          <div class="card-actions justify-end">
            <button class="btn btn-success btn-sm">Добавить</button>
          </div>
        </div>
      </div>

      <div class="card bg-base-200 shadow-xl">
        <div class="card-body">
          <h2 class="card-title text-error">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" viewBox="0 0 24 24" stroke="currentColor">
              <path fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4" />
            </svg>
            Расходы
          </h2>
          <p class="text-3xl font-bold text-error">₽ 0</p>
          <div class="card-actions justify-end">
            <button class="btn btn-error btn-sm">Добавить</button>
          </div>
        </div>
      </div>

      <div class="card bg-base-200 shadow-xl">
        <div class="card-body">
          <h2 class="card-title text-info">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" viewBox="0 0 24 24" stroke="currentColor">
              <path fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Баланс
          </h2>
          <p class="text-3xl font-bold text-info">₽ 0</p>
          <div class="card-actions justify-end">
            <button class="btn btn-info btn-sm">Детали</button>
          </div>
        </div>
      </div>
    </div>

    <div class="card bg-base-200 shadow-xl">
      <div class="card-body">
        <h2 class="card-title mb-4">Быстрые действия</h2>
        <div class="flex flex-wrap gap-4">
          <button class="btn btn-outline btn-success">
            Добавить доход
          </button>
          <button class="btn btn-outline btn-error">
            Добавить расход
          </button>
          <button class="btn btn-outline btn-info">
            Создать категорию
          </button>
          <button class="btn btn-outline">
            Экспорт данных
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
</script>
