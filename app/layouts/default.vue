<template>
  <div class="min-h-screen bg-base-100">
    <header class="navbar bg-base-200 shadow-lg">
      <div class="navbar-start gap-4">
        <NuxtLink
          to="/"
          class="text-2xl font-bold flex items-center gap-2 ml-4"
          data-testid="logo-link"
        >
          <img
            src="/logo.svg"
            alt="dom.cash"
            class="w-9 h-9"
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
            data-testid="budget-nav-link"
          >
            <Icon
              name="heroicons:banknotes"
              size="16"
            />
            Бюджет
          </NuxtLink>
        </div>
      </div>

      <div class="navbar-center gap-2">
        <ThemePicker />
        <template v-if="isAuthenticated">
          <button
            class="btn btn-outline btn-sm"
            data-testid="shared-budgets-btn"
            @click="modalsStore.openSharedBudgetsModal"
          >
            <Icon
              name="heroicons:users"
              size="16"
            />
            Общие бюджеты
          </button>
          <button
            class="btn btn-outline btn-sm"
            data-testid="share-btn"
            @click="modalsStore.openShareModal('')"
          >
            <Icon
              name="heroicons:share"
              size="16"
            />
            Поделиться
          </button>
        </template>
      </div>

      <div class="navbar-end gap-2">
        <div
          v-if="isAuthenticated"
          class="dropdown dropdown-end"
        >
          <div
            tabindex="0"
            role="button"
            class="btn btn-ghost"
            data-testid="user-dropdown"
          >
            <Icon
              name="heroicons:user"
              size="16"
            />
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
                data-testid="logout-btn"
                @click="logout"
              >
                <Icon
                  name="heroicons:arrow-right-start-on-rectangle"
                  size="16"
                />
                Выйти
              </button>
            </li>
          </ul>
        </div>

        <NuxtLink
          v-else
          to="/auth"
          class="btn btn-primary"
          data-testid="login-btn"
        >
          <Icon
            name="heroicons:arrow-right-end-on-rectangle"
            size="16"
          />
          Войти
        </NuxtLink>
      </div>
    </header>

    <OutdatedDataBanner />

    <main>
      <slot />
    </main>

    <BudgetShareModal />
    <BudgetSharedBudgetsModal />
    <AppToast />
  </div>
</template>

<script setup lang="ts">
import ThemePicker from '~/components/ui/ThemePicker.vue'
import { useModalsStore } from '~/stores/modals'

const { user, isAuthenticated, logout } = useAuth()
const modalsStore = useModalsStore()
</script>
