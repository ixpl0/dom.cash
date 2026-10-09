<template>
  <UiDialog
    :is-open="isOpen"
    content-class="modal-box sm:max-h-[90vh] sm:w-[calc(100vw-2rem)] sm:max-w-2xl flex flex-col"
    data-testid="mcp-modal"
    :title="t('mcp.title')"
    close-button-test-id="mcp-modal-close"
    @close="emit('close')"
  >
    <div class="flex-1 space-y-4 overflow-y-auto min-h-0">
      <p class="text-sm text-base-content/70">
        {{ t('mcp.description') }}
      </p>

      <ol class="list-decimal space-y-3 pl-5 text-sm">
        <li>{{ t('mcp.steps.open') }}</li>
        <li class="space-y-2">
          <span>{{ t('mcp.steps.paste') }}</span>
          <div class="join w-full">
            <input
              :value="serverUrl"
              readonly
              class="input input-bordered input-sm join-item min-w-0 flex-1 font-mono"
              data-testid="mcp-server-url"
            >
            <button
              type="button"
              class="btn btn-sm join-item"
              data-testid="mcp-copy-url-btn"
              @click="copyServerUrl"
            >
              <Icon
                name="heroicons:clipboard-document"
                size="16"
              />
              {{ t('mcp.copy') }}
            </button>
          </div>
        </li>
        <li>{{ t('mcp.steps.connect') }}</li>
      </ol>

      <a
        href="https://claude.ai/customize/connectors"
        target="_blank"
        rel="noopener noreferrer"
        class="btn btn-outline btn-sm"
        data-testid="mcp-open-connectors"
      >
        <Icon
          name="heroicons:arrow-top-right-on-square"
          size="16"
        />
        {{ t('mcp.openConnectors') }}
      </a>

      <h4 class="font-semibold">
        {{ t('mcp.connectionsTitle') }}
      </h4>

      <div
        v-if="isLoading"
        class="flex justify-center py-4"
      >
        <span class="loading loading-spinner loading-md" />
      </div>
      <div
        v-else-if="connections.length > 0"
        class="flex flex-col gap-2"
        data-testid="mcp-connection-list"
      >
        <div
          v-for="connection in connections"
          :key="connection.id"
          class="flex items-center gap-3 rounded-box border border-base-300 p-3"
          data-testid="mcp-connection-row"
        >
          <div class="min-w-0 flex-1 space-y-1">
            <div
              class="break-all font-medium"
              data-testid="mcp-connection-name"
            >
              {{ connection.clientName }}
            </div>
            <div class="flex flex-wrap gap-1">
              <span
                v-for="scope in connection.scopes"
                :key="scope"
                class="badge badge-sm badge-ghost"
                data-testid="mcp-connection-scope"
              >
                {{ t(`mcp.scopes.${scope}`) }}
              </span>
            </div>
            <div class="text-xs text-base-content/60">
              {{ t('mcp.connectedAt', { date: formatDate(connection.createdAt) }) }}
              ·
              {{ connection.lastUsedAt ? t('mcp.lastUsedAt', { date: formatDate(connection.lastUsedAt) }) : t('mcp.neverUsed') }}
            </div>
          </div>
          <button
            type="button"
            class="btn btn-sm btn-error flex-shrink-0"
            :disabled="disconnectingId === connection.id"
            :aria-label="t('mcp.disconnectConfirm')"
            data-testid="mcp-connection-disconnect-btn"
            @click="disconnect(connection)"
          >
            <span
              v-if="disconnectingId === connection.id"
              class="loading loading-spinner loading-xs"
            />
            <Icon
              v-else
              name="heroicons:trash"
              size="16"
            />
          </button>
        </div>
      </div>
      <p
        v-else
        class="py-4 text-center text-base-content/60"
        data-testid="mcp-empty-state"
      >
        {{ t('mcp.empty') }}
      </p>
    </div>
  </UiDialog>
</template>

<script setup lang="ts">
import type { McpConnection, McpConnectionsData } from '~~/shared/types/mcp'
import { copyText } from '~/utils/clipboard'

interface Props {
  isOpen: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
}>()

const { t, locale } = useI18n()
const { toast } = useToast()
const { formatError } = useServerError()
const { confirm } = useConfirmation()
const requestUrl = useRequestURL()

const connections = ref<McpConnection[]>([])
const isLoading = ref(false)
const disconnectingId = ref<string | null>(null)

const serverUrl = computed((): string => `${requestUrl.origin}/api/mcp`)

const formatDate = (value: string): string => new Date(value).toLocaleDateString(locale.value)

const loadConnections = async (): Promise<void> => {
  isLoading.value = true

  try {
    connections.value = (await $fetch<McpConnectionsData>('/api/user/mcp-connections')).connections
  }
  catch (error) {
    toast({ type: 'error', message: formatError(error, t('mcp.loadError')) })
  }
  finally {
    isLoading.value = false
  }
}

const disconnect = async (connection: McpConnection): Promise<void> => {
  const confirmed = await confirm({
    title: t('mcp.disconnectTitle'),
    message: t('mcp.disconnectMessage', { client: connection.clientName }),
    variant: 'danger',
    confirmText: t('mcp.disconnectConfirm'),
    cancelText: t('common.cancel'),
  })

  if (!confirmed) {
    return
  }

  disconnectingId.value = connection.id

  try {
    await $fetch(`/api/user/mcp-connections/${encodeURIComponent(connection.id)}`, { method: 'DELETE' })
    connections.value = connections.value.filter(({ id }) => id !== connection.id)
  }
  catch (error) {
    toast({ type: 'error', message: formatError(error, t('mcp.disconnectError')) })
  }
  finally {
    disconnectingId.value = null
  }
}

const copyServerUrl = async (): Promise<void> => {
  const isCopied = await copyText(serverUrl.value)
  toast(isCopied ? { type: 'success', message: t('mcp.copied') } : { type: 'error', message: t('mcp.copyError') })
}

watch(() => props.isOpen, async (open) => {
  if (open) {
    await loadConnections()
  }
})
</script>
