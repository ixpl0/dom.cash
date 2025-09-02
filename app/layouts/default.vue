<template>
  <div class="min-h-screen bg-base-100">
    <header class="navbar bg-base-200 shadow-lg">
      <div class="navbar-start gap-4">
        <NuxtLink
          to="/"
          class="text-xl font-bold flex items-center gap-2"
        >
          <img
            src="/logo.svg"
            alt="dom.cash"
            class="w-6 h-6"
          >
          dom.cash
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
      <div class="navbar-end gap-2">
        <ThemePicker />
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
            <Icon
              name="heroicons:link"
              size="16"
            />
            Поделиться
          </button>
          <div class="dropdown dropdown-end">
            <div
              tabindex="0"
              role="button"
              class="btn btn-ghost"
            >
              {{ user?.username }}
              <Icon
                name="heroicons:chevron-down"
                size="16"
                class="ml-1"
              />
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
import ThemePicker from '~/components/ui/ThemePicker.vue'

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
