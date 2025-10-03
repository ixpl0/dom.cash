<template>
  <header class="navbar bg-base-200 flex justify-between gap-4 px-4">
    <div class="flex items-center gap-4">
      <NuxtLink
        to="/"
        class="text-2xl font-bold flex items-center gap-2 ml-4"
        data-testid="logo-link"
      >
        <UiLogo class="w-9 h-9" />
        <span class="hidden xl:inline">dom.cash</span>
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
          <span class="hidden xl:inline">Бюджет</span>
        </NuxtLink>
      </div>
    </div>

    <div class="flex items-center gap-2">
      <UiThemePicker />

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
          <span class="hidden xl:inline">Общие бюджеты</span>
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
          <span class="hidden xl:inline">Поделиться</span>
        </button>
      </template>
    </div>

    <div class="flex items-center gap-2">
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
            class="flex-shrink-0"
          />
          <span class="break-all">{{ user?.username }}</span>
          <Icon
            name="heroicons:chevron-down"
            size="16"
            class="flex-shrink-0 ml-1"
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
</template>

<script setup lang="ts">
const { user, isAuthenticated, logout } = useAuth()
const modalsStore = useModalsStore()
</script>
