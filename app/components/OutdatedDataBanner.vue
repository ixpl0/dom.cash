<template>
  <div
    v-if="isOutdatedBannerVisible"
    class="alert alert-error alert-soft flex"
  >
    <div class="flex items-center justify-between max-w-7xl mx-auto gap-4">
      <div class="flex items-center gap-3">
        <Icon
          name="heroicons:exclamation-triangle-solid"
          size="20"
          class="flex-shrink-0"
        />
        <span class="font-medium">
          {{ t('outdated.message') }}
        </span>
      </div>

      <div class="flex items-center gap-2">
        <button
          class="btn btn-sm btn-outline"
          @click="refreshPage"
        >
          {{ t('outdated.refresh') }}
        </button>

        <button
          class="btn btn-sm btn-circle btn-ghost"
          @click="hide"
        >
          <Icon
            name="heroicons:x-mark"
            size="20"
          />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n()
const { isOutdatedBannerVisible, hideWarningBanner } = useOutdatedBanner()

const hide = () => {
  hideWarningBanner()
}

const refreshPage = () => {
  window.location.reload()
}
</script>
