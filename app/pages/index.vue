<template>
  <div>
    <div class="hero min-h-[calc(100vh-400px)]">
      <div class="hero-content text-center">
        <div class="max-w-md">
          <h1 class="text-5xl font-bold">
            🏠 Doma
          </h1>
          <p class="py-6">
            Управляйте своими финансами легко и удобно
          </p>
          <NuxtLink
            to="/budget"
            class="btn btn-primary btn-lg"
          >
            💰 Перейти к бюджету
          </NuxtLink>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
      <div class="card bg-base-200 shadow-xl">
        <div class="card-body text-center">
          <div class="text-4xl mb-4">
            📊
          </div>
          <h2 class="card-title justify-center">
            Учёт доходов
          </h2>
          <p>Отслеживайте все источники доходов и анализируйте финансовые поступления</p>
        </div>
      </div>

      <div class="card bg-base-200 shadow-xl">
        <div class="card-body text-center">
          <div class="text-4xl mb-4">
            💳
          </div>
          <h2 class="card-title justify-center">
            Контроль расходов
          </h2>
          <p>Ведите учёт всех трат и категоризируйте расходы для лучшего понимания</p>
        </div>
      </div>

      <div class="card bg-base-200 shadow-xl">
        <div class="card-body text-center">
          <div class="text-4xl mb-4">
            💰
          </div>
          <h2 class="card-title justify-center">
            Планирование бюджета
          </h2>
          <p>Планируйте свой бюджет и достигайте финансовых целей</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
</script>
