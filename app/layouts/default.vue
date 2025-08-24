<template>
  <div class="min-h-screen bg-base-100">
    <header class="navbar bg-base-200 shadow-lg">
      <div class="navbar-start gap-4">
        <NuxtLink
          to="/"
          class="text-xl font-bold"
        >
          💰 dom.cash
        </NuxtLink>
        <div
          v-if="isAuthenticated"
          class="menu menu-horizontal"
        >
          <NuxtLink
            to="/budget"
            class="btn btn-sm btn-outline"
          >
            Бюджет
          </NuxtLink>
        </div>
      </div>
      <div class="navbar-end">
        <div
          v-if="isAuthenticated"
          class="flex items-center gap-2"
        >
          <button
            class="btn btn-outline btn-sm"
            @click="openSharedBudgetsModal"
          >
            Общие бюджеты
          </button>
          <button
            class="btn btn-outline btn-sm"
            @click="openShareModal"
          >
            🔗 Поделиться
          </button>
          <div class="dropdown dropdown-end">
            <div
              tabindex="0"
              role="button"
              class="btn btn-ghost"
            >
              {{ user?.username }}
              <svg
                class="w-4 h-4 ml-1"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  fill="none"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </div>
            <ul
              tabindex="0"
              class="dropdown-content menu bg-base-100 rounded-box z-[1] w-52 p-2 shadow"
            >
              <li>
                <button
                  class="btn btn-ghost btn-sm"
                  @click="logout"
                >
                  Выйти
                </button>
              </li>
            </ul>
          </div>
        </div>
        <NuxtLink
          v-else
          to="/auth"
          class="btn btn-primary"
        >Войти</NuxtLink>
      </div>
    </header>

    <OutdatedDataBanner ref="outdatedBanner" />

    <main>
      <slot />
    </main>

    <BudgetShareModal ref="shareModal" />
    <BudgetSharedBudgetsModal ref="sharedBudgetsModal" />
    <AppToast />
  </div>
</template>

<script setup lang="ts">
const { user, isAuthenticated, logout } = useAuth()
const { setWarningBannerRef } = useOutdatedBanner()

const shareModal = ref()
const sharedBudgetsModal = ref()
const outdatedBanner = ref()

onMounted(() => {
  setWarningBannerRef(outdatedBanner.value)
})

const openShareModal = (): void => {
  shareModal.value?.show()
}

const openSharedBudgetsModal = (): void => {
  sharedBudgetsModal.value?.show()
}
</script>
