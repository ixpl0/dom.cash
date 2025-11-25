<script setup lang="ts">
import type { AdminUsersResponse } from '~~/shared/types'

const { user: currentUser } = useAuth()

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
  title: 'Metrics & Users',
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

const formatDate = (dateStr: string | Date) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString()
}
</script>

<template>
  <div class="container mx-auto p-4">
    <h1 class="text-2xl font-bold mb-6">
      Admin Dashboard
    </h1>

    <div class="bg-base-100 p-6 rounded-lg shadow-md border border-base-300">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-xl font-semibold">
          Users
        </h2>
        <div class="form-control w-full max-w-xs">
          <input
            :value="search"
            type="text"
            placeholder="Search by email..."
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
                Email
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
                Status
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
                Role
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
                Registered
                <span
                  v-if="sortBy === 'createdAt'"
                  class="text-xs ml-1"
                >{{ sortOrder === 'asc' ? '▲' : '▼' }}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="pending && !users.length">
              <td
                colspan="4"
                class="text-center py-4"
              >
                Loading...
              </td>
            </tr>
            <tr v-else-if="users.length === 0">
              <td
                colspan="4"
                class="text-center py-4"
              >
                No users found
              </td>
            </tr>
            <tr
              v-for="u in users"
              :key="u.id"
            >
              <td>
                <div class="font-bold">
                  {{ u.username }}
                </div>
              </td>
              <td>
                <div
                  class="badge"
                  :class="u.emailVerified ? 'badge-success' : 'badge-warning'"
                >
                  {{ u.emailVerified ? 'Verified' : 'Unverified' }}
                </div>
              </td>
              <td>
                <div
                  class="badge"
                  :class="u.isAdmin ? 'badge-primary' : 'badge-ghost'"
                >
                  {{ u.isAdmin ? 'Admin' : 'User' }}
                </div>
              </td>
              <td>{{ formatDate(u.createdAt) }}</td>
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
            Page {{ page }} of {{ totalPages }}
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
