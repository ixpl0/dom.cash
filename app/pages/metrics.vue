<script setup lang="ts">
const { user } = useAuth()

if (!user.value?.isAdmin) {
  throw createError({
    statusCode: 403,
    message: 'Access denied',
  })
}

useHead({
  title: 'Metrics',
})
</script>

<template>
  <div class="container mx-auto p-4">
    <h1 class="text-2xl font-bold mb-4">
      Metrics
    </h1>
    <div class="bg-base-200 p-6 rounded-lg">
      <p>Metrics dashboard coming soon...</p>
    </div>
  </div>
</template>
