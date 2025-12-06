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
const config = useRuntimeConfig()

const titlePrefix = computed(() => {
  if (import.meta.dev) {
    return '🔧 local - '
  }

  if (config.public.environment === 'test') {
    return '🧪 test - '
  }

  return ''
})

useHead({
  htmlAttrs: {
    lang: locale,
  },
  title: () => `${titlePrefix.value}${t('meta.title')}`,
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
