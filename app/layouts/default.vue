<template>
  <div class="min-h-screen bg-base-100">
    <AppHeader />

    <main>
      <slot />
    </main>

    <BudgetShareModal />
    <BudgetSharedBudgetsModal />
    <AppToast />
  </div>
</template>
