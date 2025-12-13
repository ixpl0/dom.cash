<template>
  <div data-testid="memo-page">
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
      <h1 class="text-2xl font-bold">
        {{ t('memo.title') }}
      </h1>

      <button
        class="btn btn-primary"
        data-testid="memo-add-button"
        @click="memoModalsStore.openMemoModal()"
      >
        <Icon
          name="heroicons:plus"
          size="20"
        />
        {{ t('memo.addNew') }}
      </button>
    </div>

    <div
      v-if="memoStore.isLoading"
      class="flex justify-center py-8"
    >
      <span class="loading loading-spinner loading-lg" />
    </div>

    <div
      v-else-if="memoStore.error"
      class="alert alert-error"
    >
      {{ memoStore.error }}
    </div>

    <MemoList
      v-else
      :items="memoStore.filteredItems"
      :empty-message="emptyMessage"
    />

    <MemoModal />
  </div>
</template>

<script setup lang="ts">
const memoStore = useMemoStore()
const memoModalsStore = useMemoModalsStore()
const { t } = useI18n()

const emptyMessage = computed(() => t('memo.emptyState'))
</script>
