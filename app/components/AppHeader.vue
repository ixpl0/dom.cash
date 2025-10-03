<template>
  <header class="navbar bg-base-200 flex justify-between gap-4 px-4">
    <NuxtLink
      to="/"
      class="text-2xl font-bold flex items-center gap-2 ml-4"
      data-testid="logo-link"
    >
      <UiLogo class="w-9 h-9" />
      dom.cash
    </NuxtLink>

    <div class="hidden md:flex items-center gap-2">
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

    <div class="hidden md:flex items-center gap-2">
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

    <div class="flex-none md:hidden">
      <div class="dropdown dropdown-end">
        <div
          tabindex="0"
          role="button"
          class="btn btn-ghost btn-square"
          data-testid="mobile-menu-btn"
        >
          <Icon
            name="heroicons:bars-3"
            size="24"
          />
        </div>
        <ul
          tabindex="0"
          class="dropdown-content menu bg-base-100 rounded-box z-[1] p-2 shadow mt-3"
        >
          <li v-if="isAuthenticated">
            <button
              data-testid="mobile-shared-budgets-btn"
              @click="modalsStore.openSharedBudgetsModal"
            >
              <Icon
                name="heroicons:users"
                size="16"
              />
              Общие бюджеты
            </button>
          </li>
          <li v-if="isAuthenticated">
            <button
              data-testid="mobile-share-btn"
              @click="modalsStore.openShareModal('')"
            >
              <Icon
                name="heroicons:share"
                size="16"
              />
              Поделиться
            </button>
          </li>
          <UiThemePicker class="px-3 py-2" />
          <div
            v-if="isAuthenticated"
            class="divider my-0"
          />
          <div
            v-if="isAuthenticated"
            class="flex items-center gap-2 px-3 py-2"
          >
            <Icon
              name="heroicons:user"
              size="16"
            />
            <span class="break-all">{{ user?.username }}</span>
          </div>
          <li v-if="isAuthenticated">
            <button
              data-testid="mobile-logout-btn"
              @click="logout"
            >
              <Icon
                name="heroicons:arrow-right-start-on-rectangle"
                size="16"
              />
              Выйти
            </button>
          </li>
          <li v-else>
            <NuxtLink
              to="/auth"
              data-testid="mobile-login-link"
            >
              <Icon
                name="heroicons:arrow-right-end-on-rectangle"
                size="16"
              />
              Войти
            </NuxtLink>
          </li>
        </ul>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
const { user, isAuthenticated, logout } = useAuth()
const modalsStore = useModalsStore()
</script>
