<template>
  <div class="min-h-screen bg-base-100">
    <main class="container mx-auto px-4 py-8">
      <div class="text-center space-y-6">
        <h2
          class="text-4xl font-bold flex items-center justify-center gap-3"
          data-testid="home-title"
        >
          <img
            src="/logo.svg"
            alt="dom.cash"
            class="w-10 h-10"
          >
          dom.cash
        </h2>
        <p
          class="text-xl opacity-70"
          data-testid="home-subtitle"
        >
          Прозрачность домашних финансов
        </p>

        <div
          class="space-y-4"
        >
          <NuxtLink
            to="/budget"
            class="btn btn-primary btn-lg"
            data-testid="go-to-budget-btn"
          >
            <Icon
              name="heroicons:banknotes"
              size="24"
            />
            Перейти к бюджету
          </NuxtLink>
        </div>
      </div>
    </main>
  </div>
</template>
