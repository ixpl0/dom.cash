<template>
  <header class="navbar bg-base-200 flex justify-between gap-4 px-4 relative z-40">
    <NuxtLink
      to="/"
      class="text-2xl font-bold flex items-center gap-2 ml-4"
      data-testid="logo-link"
    >
      <UiLogo class="w-9 h-9" />
      dom.cash
    </NuxtLink>

    <div
      class="hidden md:flex items-center gap-2"
      data-testid="desktop-header-actions"
    >
      <template v-if="isAuthenticated">
        <NuxtLink
          to="/budget"
          class="btn btn-outline btn-sm"
          data-testid="budget-btn"
        >
          <Icon
            name="heroicons:banknotes"
            size="16"
          />
          {{ t('header.budget') }}
        </NuxtLink>
        <div class="indicator">
          <span
            v-if="todoStore.overdueCount > 0"
            class="indicator-item badge badge-error badge-xs"
            data-testid="todo-overdue-count"
          >
            {{ todoStore.overdueCount }}
          </span>
          <NuxtLink
            to="/todo"
            class="btn btn-outline btn-sm"
            data-testid="todo-btn"
          >
            <Icon
              name="heroicons:document-text"
              size="16"
            />
            {{ t('header.todo') }}
          </NuxtLink>
        </div>
        <NuxtLink
          to="/docs"
          class="btn btn-outline btn-sm"
          data-testid="docs-btn"
        >
          <Icon
            name="heroicons:identification"
            size="16"
          />
          {{ t('header.docs') }}
        </NuxtLink>
      </template>

      <UiLanguagePicker class="hidden xl:flex" />
      <UiThemePicker class="hidden xl:flex" />
    </div>

    <div
      class="hidden md:flex items-center gap-2"
      data-testid="desktop-user-menu"
    >
      <div
        v-if="isAuthenticated"
        ref="userMenuRef"
        class="dropdown dropdown-end"
        @focusin="handleUserMenuFocusIn"
        @focusout="handleUserMenuFocusOut"
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
          data-testid="user-dropdown-content"
        >
          <UiLanguagePicker class="xl:hidden px-3 py-1" />
          <UiThemePicker class="xl:hidden px-3 py-1" />
          <li v-if="user?.isAdmin">
            <NuxtLink
              to="/metrics"
              data-testid="metrics-btn"
            >
              <Icon
                name="heroicons:chart-bar"
                size="16"
              />
              {{ t('header.metrics') }}
            </NuxtLink>
          </li>
          <li>
            <button
              data-testid="logout-btn"
              @click="logout"
            >
              <Icon
                name="heroicons:arrow-right-start-on-rectangle"
                size="16"
              />
              {{ t('header.logout') }}
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
        {{ t('header.login') }}
      </NuxtLink>
    </div>

    <div class="flex-none md:hidden">
      <div
        ref="mobileMenuRef"
        class="dropdown dropdown-end"
        @focusin="handleMobileMenuFocusIn"
        @focusout="handleMobileMenuFocusOut"
      >
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
          <template v-if="isAuthenticated">
            <li>
              <NuxtLink
                to="/budget"
                data-testid="mobile-budget-btn"
              >
                <Icon
                  name="heroicons:banknotes"
                  size="16"
                />
                {{ t('header.budget') }}
              </NuxtLink>
            </li>
            <li>
              <NuxtLink
                to="/todo"
                class="flex items-center justify-between"
                data-testid="mobile-todo-btn"
              >
                <span class="flex items-center gap-2">
                  <Icon
                    name="heroicons:document-text"
                    size="16"
                  />
                  {{ t('header.todo') }}
                </span>
                <span
                  v-if="todoStore.overdueCount > 0"
                  class="badge badge-error badge-xs"
                  data-testid="mobile-todo-overdue-count"
                >
                  {{ todoStore.overdueCount }}
                </span>
              </NuxtLink>
            </li>
            <li>
              <NuxtLink
                to="/docs"
                data-testid="mobile-docs-btn"
              >
                <Icon
                  name="heroicons:identification"
                  size="16"
                />
                {{ t('header.docs') }}
              </NuxtLink>
            </li>
            <li v-if="user?.isAdmin">
              <NuxtLink
                to="/metrics"
                data-testid="mobile-metrics-btn"
              >
                <Icon
                  name="heroicons:chart-bar"
                  size="16"
                />
                {{ t('header.metrics') }}
              </NuxtLink>
            </li>
          </template>

          <UiLanguagePicker class="px-3 py-1" />
          <UiThemePicker class="px-3 py-1" />

          <template v-if="isAuthenticated">
            <div class="divider my-0" />
            <div class="flex items-center gap-2 px-3 py-2">
              <Icon
                name="heroicons:user"
                size="16"
              />
              <span>{{ user?.username }}</span>
            </div>
            <li>
              <button
                data-testid="mobile-logout-btn"
                @click="logout"
              >
                <Icon
                  name="heroicons:arrow-right-start-on-rectangle"
                  size="16"
                />
                {{ t('header.logout') }}
              </button>
            </li>
          </template>
          <li v-else>
            <NuxtLink
              to="/auth"
              data-testid="mobile-login-link"
            >
              <Icon
                name="heroicons:arrow-right-end-on-rectangle"
                size="16"
              />
              {{ t('header.login') }}
            </NuxtLink>
          </li>
        </ul>
      </div>
    </div>
  </header>

  <div
    v-if="user?.impersonatedBy"
    class="flex items-center justify-center gap-3 bg-warning px-4 py-2 text-warning-content"
    data-testid="impersonation-banner"
  >
    <Icon
      name="heroicons:eye"
      size="20"
      class="flex-shrink-0"
    />
    <span class="font-semibold break-all">
      {{ t('header.impersonationBanner', { username: user?.username }) }}
    </span>
    <button
      class="btn btn-xs btn-circle btn-ghost flex-shrink-0 text-warning-content hover:border-transparent hover:bg-warning-content/15"
      :title="t('header.impersonationExit')"
      data-testid="impersonation-exit-btn"
      @click="exitImpersonation"
    >
      <Icon
        name="heroicons:x-mark"
        size="16"
      />
    </button>
  </div>
</template>

<script setup lang="ts">
const { user, isAuthenticated, logout } = useAuth()
const todoStore = useTodoStore()
const { t } = useI18n()

const {
  dropdownRef: userMenuRef,
  handleFocusIn: handleUserMenuFocusIn,
  handleFocusOut: handleUserMenuFocusOut,
} = useDropdownBackHandler()

const {
  dropdownRef: mobileMenuRef,
  handleFocusIn: handleMobileMenuFocusIn,
  handleFocusOut: handleMobileMenuFocusOut,
} = useDropdownBackHandler()

const exitImpersonation = async (): Promise<void> => {
  await $fetch('/api/admin/impersonate', { method: 'DELETE' }).catch(() => {})
  window.location.href = '/metrics'
}
</script>
