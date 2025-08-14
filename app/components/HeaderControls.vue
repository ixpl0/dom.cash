<template>
  <div
    v-if="controls.length"
    class="flex gap-2 mr-2"
  >
    <component
      :is="Control"
      v-for="(Control, index) in controls"
      :key="index"
    />
  </div>
</template>

<script setup lang="ts">
const controls = useHeaderControls()
</script>
