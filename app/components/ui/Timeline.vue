<template>
  <ul
    class="timeline timeline-vertical"
    :class="props.class"
  >
    <slot />
  </ul>
</template>

<script setup lang="ts">
import { timelineColumnsSyncKey } from '~/types/timeline'

interface Props {
  class?: string
}

const props = withDefaults(defineProps<Props>(), {
  class: '',
})

const columnsSync = useBudgetColumnsSync()

provide(timelineColumnsSyncKey, {
  registerRow: columnsSync.registerRow,
  unregisterRow: columnsSync.unregisterRow,
})
</script>
