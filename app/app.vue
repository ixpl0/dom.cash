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
const { t, locale } = useI18n()

useHead({
  htmlAttrs: {
    lang: locale,
  },
  title: () => t('meta.title'),
  meta: [
    { name: 'description', content: () => t('meta.description') },
    { name: 'keywords', content: () => t('meta.keywords') },
    { property: 'og:title', content: () => t('meta.title') },
    { property: 'og:description', content: () => t('meta.description') },
  ],
})

onMounted(() => {
  document.body.setAttribute('data-hydrated', 'true')
})
</script>
