<script setup lang="ts">
import type { AdminUsersResponse, AdminUser } from '~~/shared/types'
import type { ConfirmationModalMessage } from '~/components/ui/ConfirmationModal.vue'

const { t } = useI18n()
const { formatError } = useServerError()
const { user: currentUser } = useAuth()
const { confirm } = useConfirmation()
const { toast } = useToast()

if (!currentUser.value) {
  throw createError({
    statusCode: 401,
    message: 'Authentication required',
  })
}

if (!currentUser.value.isAdmin) {
  throw createError({
    statusCode: 403,
    message: 'Access denied',
  })
}

useHead({
  title: computed(() => t('metrics.title')),
})

const page = ref(1)
const limit = ref(10)
const search = ref('')
const sortBy = ref('createdAt')
const sortOrder = ref<'asc' | 'desc'>('desc')
const debouncedSearch = ref('')

let searchTimeout: NodeJS.Timeout

const updateSearch = (val: string) => {
  search.value = val
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    debouncedSearch.value = val
    page.value = 1 // Reset to first page on search
  }, 300)
}

const { data, pending, error } = await useFetch<AdminUsersResponse>('/api/admin/users', {
  query: computed(() => ({
    page: page.value,
    limit: limit.value,
    q: debouncedSearch.value,
    sortBy: sortBy.value,
    order: sortOrder.value,
  })),
  watch: [page, limit, debouncedSearch, sortBy, sortOrder],
})

if (error.value) {
  throw createError({
    statusCode: error.value.statusCode || 500,
    message: error.value.message || 'Failed to load users',
  })
}

const users = computed(() => data.value?.users || [])
const total = computed(() => data.value?.total || 0)
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / limit.value)))

const toggleSort = (column: string) => {
  if (sortBy.value === column) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  }
  else {
    sortBy.value = column
    sortOrder.value = 'asc'
  }
}

const { locale } = useI18n()

const formatDate = (dateStr: string | Date) => {
  if (!dateStr) {
    return '-'
  }
  return new Date(dateStr).toLocaleDateString(locale.value, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

const formatDateTime = (dateStr: string | Date | null) => {
  if (!dateStr) {
    return '-'
  }
  return new Date(dateStr).toLocaleString(locale.value, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const deletingUserId = ref<string | null>(null)

const deleteUser = async (targetUser: AdminUser): Promise<void> => {
  const message: ConfirmationModalMessage = [
    t('metrics.deleteConfirmMessage'),
    { text: targetUser.username, isBold: true },
    t('metrics.deleteConfirmMessageEnd'),
  ]

  const confirmed = await confirm({
    title: t('metrics.deleteConfirmTitle'),
    message,
    variant: 'danger',
    confirmText: t('metrics.deleteConfirmButton'),
    cancelText: t('common.cancel'),
    icon: 'heroicons:trash',
  })

  if (!confirmed) {
    return
  }

  deletingUserId.value = targetUser.id

  try {
    await $fetch(`/api/admin/users/${targetUser.id}`, {
      method: 'DELETE',
    })

    await refreshNuxtData()
    toast({ type: 'success', message: t('metrics.deleteSuccess') })
  }
  catch (error: unknown) {
    toast({ type: 'error', message: formatError(error, t('metrics.deleteError')) })
  }
  finally {
    deletingUserId.value = null
  }
}
</script>

<template>
  <div class="container mx-auto p-4">
    <h1 class="text-2xl font-bold mb-6">
      {{ t('metrics.dashboardTitle') }}
    </h1>

    <div class="bg-base-100 p-6 rounded-lg shadow-md border border-base-300">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-xl font-semibold">
          {{ t('metrics.usersTitle') }}
        </h2>
        <div class="form-control w-full max-w-xs">
          <input
            :value="search"
            type="text"
            :placeholder="t('metrics.searchPlaceholder')"
            class="input input-bordered w-full"
            data-testid="user-search-input"
            @input="e => updateSearch((e.target as HTMLInputElement).value)"
          >
        </div>
      </div>

      <div class="overflow-x-auto">
        <table
          class="table table-zebra w-full"
          data-testid="users-table"
        >
          <thead>
            <tr>
              <th
                class="cursor-pointer hover:bg-base-200"
                data-testid="sort-email"
                @click="toggleSort('username')"
              >
                {{ t('metrics.emailColumn') }}
                <span
                  v-if="sortBy === 'username'"
                  class="text-xs ml-1"
                >{{ sortOrder === 'asc' ? '▲' : '▼' }}</span>
              </th>
              <th
                class="cursor-pointer hover:bg-base-200"
                data-testid="sort-status"
                @click="toggleSort('status')"
              >
                {{ t('metrics.statusColumn') }}
                <span
                  v-if="sortBy === 'status'"
                  class="text-xs ml-1"
                >{{ sortOrder === 'asc' ? '▲' : '▼' }}</span>
              </th>
              <th
                class="cursor-pointer hover:bg-base-200"
                data-testid="sort-role"
                @click="toggleSort('role')"
              >
                {{ t('metrics.roleColumn') }}
                <span
                  v-if="sortBy === 'role'"
                  class="text-xs ml-1"
                >{{ sortOrder === 'asc' ? '▲' : '▼' }}</span>
              </th>
              <th
                class="cursor-pointer hover:bg-base-200"
                data-testid="sort-registered"
                @click="toggleSort('createdAt')"
              >
                {{ t('metrics.registeredColumn') }}
                <span
                  v-if="sortBy === 'createdAt'"
                  class="text-xs ml-1"
                >{{ sortOrder === 'asc' ? '▲' : '▼' }}</span>
              </th>
              <th
                class="cursor-pointer hover:bg-base-200"
                data-testid="sort-last-activity"
                @click="toggleSort('lastActivityAt')"
              >
                {{ t('metrics.lastActivityColumn') }}
                <span
                  v-if="sortBy === 'lastActivityAt'"
                  class="text-xs ml-1"
                >{{ sortOrder === 'asc' ? '▲' : '▼' }}</span>
              </th>
              <th class="w-1">
                {{ t('common.actions') }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="pending && !users.length">
              <td
                colspan="6"
                class="text-center py-4"
              >
                {{ t('metrics.loading') }}
              </td>
            </tr>
            <tr v-else-if="users.length === 0">
              <td
                colspan="6"
                class="text-center py-4"
              >
                {{ t('metrics.noUsersFound') }}
              </td>
            </tr>
            <tr
              v-for="user in users"
              :key="user.id"
            >
              <td class="max-w-[350px]">
                <div
                  class="font-bold truncate"
                  :title="user.username"
                >
                  {{ user.username }}
                </div>
              </td>
              <td>
                <div
                  class="badge whitespace-nowrap"
                  :class="user.emailVerified ? 'badge-success' : 'badge-error'"
                >
                  {{ user.emailVerified ? t('metrics.statusVerified') : t('metrics.statusUnverified') }}
                </div>
              </td>
              <td>
                <div
                  class="badge whitespace-nowrap"
                  :class="user.isAdmin ? 'badge-primary' : 'badge-ghost'"
                >
                  {{ user.isAdmin ? t('metrics.roleAdmin') : t('metrics.roleUser') }}
                </div>
              </td>
              <td>{{ formatDate(user.createdAt) }}</td>
              <td>{{ formatDateTime(user.lastActivityAt) }}</td>
              <td class="w-1">
                <button
                  v-if="!user.isAdmin"
                  class="btn btn-sm btn-error"
                  :disabled="deletingUserId === user.id"
                  data-testid="delete-user-button"
                  @click="deleteUser(user)"
                >
                  <span
                    v-if="deletingUserId === user.id"
                    class="loading loading-spinner loading-xs"
                  />
                  <Icon
                    v-else
                    name="heroicons:trash"
                    size="16"
                  />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div
        v-if="totalPages > 1"
        class="flex justify-center mt-4"
      >
        <div class="join">
          <button
            class="join-item btn"
            data-testid="pagination-prev"
            :disabled="page <= 1"
            @click="page--"
          >
            «
          </button>
          <button
            class="join-item btn"
            data-testid="pagination-info"
          >
            {{ t('metrics.pageInfo', { page, total: totalPages }) }}
          </button>
          <button
            class="join-item btn"
            data-testid="pagination-next"
            :disabled="page >= totalPages"
            @click="page++"
          >
            »
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
