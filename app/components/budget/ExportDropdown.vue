<template>
  <div class="dropdown dropdown-end">
    <div
      tabindex="0"
      role="button"
      class="btn btn-ghost btn-sm"
      data-testid="export-button"
    >
      <Icon
        name="heroicons:cloud-arrow-down"
        size="20"
      />
      {{ t('budget.export') }}
      <Icon
        name="heroicons:chevron-down"
        size="16"
      />
    </div>
    <ul
      tabindex="0"
      class="dropdown-content menu bg-base-100 rounded-box z-[1] w-52 p-2 shadow"
      data-testid="export-dropdown-content"
    >
      <li>
        <button
          data-testid="export-json-btn"
          @click="handleExportJson"
        >
          <Icon
            name="heroicons:document-text"
            size="16"
          />
          {{ t('budget.exportJson') }}
        </button>
      </li>
      <li>
        <button
          data-testid="export-excel-btn"
          @click="handleExportExcel"
        >
          <Icon
            name="heroicons:table-cells"
            size="16"
          />
          {{ t('budget.exportExcel') }}
        </button>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
interface Emits {
  (e: 'export', format: 'json' | 'excel'): void
}

const emit = defineEmits<Emits>()
const { t } = useI18n()

const closeDropdown = () => {
  const activeElement = document.activeElement as HTMLElement
  if (activeElement) {
    activeElement.blur()
  }
}

const handleExportJson = () => {
  closeDropdown()
  emit('export', 'json')
}

const handleExportExcel = () => {
  closeDropdown()
  emit('export', 'excel')
}
</script>
