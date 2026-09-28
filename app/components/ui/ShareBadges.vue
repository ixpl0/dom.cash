<template>
  <div
    v-if="!isOwner || sharedWith.length > 0"
    class="flex flex-wrap items-center gap-2 text-sm"
  >
    <span
      v-if="!isOwner"
      class="tooltip inline-flex items-center gap-1 text-info break-all"
      :data-tip="authorTooltip"
      data-testid="share-badges-owner"
    >
      <Icon
        name="heroicons:at-symbol"
        size="12"
        class="flex-shrink-0"
      />
      {{ ownerUsername }}
    </span>

    <span
      v-for="participant in sharedWith"
      :key="participant.id"
      class="tooltip inline-flex items-center gap-1 text-success break-all"
      :data-tip="sharedWithTooltip"
      data-testid="share-badges-participant"
    >
      <Icon
        name="heroicons:user"
        size="12"
        class="flex-shrink-0"
      />
      {{ participant.username }}
    </span>
  </div>
</template>

<script setup lang="ts">
interface Participant {
  id: string
  username: string
}

interface Props {
  isOwner: boolean
  ownerUsername: string
  sharedWith: readonly Participant[]
  authorTooltip: string
  sharedWithTooltip: string
}

defineProps<Props>()
</script>
