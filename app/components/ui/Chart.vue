<template>
  <div class="w-full">
    <div
      class="w-full"
      :style="{ height: chartHeight }"
    >
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  chartHeight?: string
}

withDefaults(defineProps<Props>(), {
  chartHeight: '400px',
})
</script>
