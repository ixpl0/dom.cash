<template>
  <div class="min-h-screen bg-base-100">
    <AppHeader />
    <OutdatedDataBanner />

    <main>
      <slot />
    </main>

    <BudgetShareModal />
    <BudgetSharedBudgetsModal />
    <AppToast />
  </div>
</template>
