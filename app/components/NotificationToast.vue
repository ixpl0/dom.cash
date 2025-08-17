<template>
  <div class="toast toast-top toast-center z-50">
    <div
      v-for="notification in notifications"
      :key="notification.id"
      class="alert alert-info shadow-lg max-w-md"
    >
      <div class="flex-1">
        <div class="text-sm font-medium">
          {{ notification.message }}
        </div>
      </div>
      <div class="flex gap-2">
        <button
          class="btn btn-sm btn-primary"
          @click="refreshPage"
        >
          Обновить страницу
        </button>
        <button
          class="btn btn-sm btn-ghost"
          @click="dismissNotification(notification.id)"
        >
          ✕
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { notifications, dismissNotification } = useNotifications()

const refreshPage = () => {
  window.location.reload()
}
</script>
