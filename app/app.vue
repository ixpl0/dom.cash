<template>
  <NuxtLayout>
    <NuxtRouteAnnouncer />
    <NuxtPage />
    <UiConfirmationModal
      :is-open="confirmationState.isOpen"
      :options="confirmationState.options"
      @confirm="handleConfirm"
      @cancel="handleCancel"
    />
  </NuxtLayout>
</template>

<script setup lang="ts">
const { confirmationState, handleConfirm, handleCancel } = useConfirmation()

onMounted(() => {
  document.body.setAttribute('data-hydrated', 'true')
})
</script>
