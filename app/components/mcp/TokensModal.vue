<template>
  <UiDialog
    :is-open="isOpen"
    content-class="modal-box sm:max-h-[90vh] sm:w-[calc(100vw-2rem)] sm:max-w-2xl flex flex-col"
    data-testid="mcp-modal"
    :title="t('mcp.title')"
    close-button-test-id="mcp-modal-close"
    @close="hide"
  >
    <div class="flex-1 space-y-4 overflow-y-auto min-h-0">
      <p class="text-sm text-base-content/70">
        {{ t('mcp.description') }}
      </p>

      <div
        v-if="createdToken"
        class="flex flex-col gap-3 rounded-box border border-success/40 bg-success/10 p-3"
        data-testid="mcp-created-token"
      >
        <p class="text-sm font-medium">
          {{ t('mcp.copyNow') }}
        </p>
        <div class="join w-full">
          <input
            :value="createdToken.secret"
            readonly
            class="input input-bordered input-sm join-item min-w-0 flex-1 font-mono"
            data-testid="mcp-token-secret"
          >
          <button
            type="button"
            class="btn btn-sm join-item"
            data-testid="mcp-copy-secret-btn"
            @click="copy(createdToken.secret)"
          >
            <Icon
              name="heroicons:clipboard-document"
              size="16"
            />
            {{ t('mcp.copy') }}
          </button>
        </div>
        <p class="text-sm">
          {{ t('mcp.commandLabel') }}
        </p>
        <div class="flex items-start gap-2">
          <code
            class="min-w-0 flex-1 break-all rounded-box bg-base-200 p-2 font-mono text-xs"
            data-testid="mcp-command"
          >{{ command }}</code>
          <button
            type="button"
            class="btn btn-sm btn-square flex-shrink-0"
            :aria-label="t('mcp.copy')"
            data-testid="mcp-copy-command-btn"
            @click="copy(command)"
          >
            <Icon
              name="heroicons:clipboard-document"
              size="16"
            />
          </button>
        </div>
      </div>

      <form
        class="flex flex-col gap-3 rounded-box bg-base-200 p-3"
        data-testid="mcp-create-form"
        @submit.prevent="createToken"
      >
        <input
          v-model="name"
          type="text"
          :maxlength="MCP_TOKEN_NAME_MAX_LENGTH"
          :placeholder="t('mcp.namePlaceholder')"
          class="input input-bordered w-full"
          data-testid="mcp-token-name-input"
        >
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="flex flex-wrap gap-4">
            <label
              v-for="scope in MCP_SCOPES"
              :key="scope"
              class="flex cursor-pointer items-center gap-2"
            >
              <input
                v-model="scopes"
                type="checkbox"
                :value="scope"
                class="checkbox checkbox-sm"
                :data-testid="`mcp-scope-${scope}`"
              >
              <span class="text-sm">{{ t(`mcp.scopes.${scope}`) }}</span>
            </label>
          </div>
          <button
            type="submit"
            class="btn btn-primary btn-sm"
            :disabled="!canCreate"
            data-testid="mcp-create-btn"
          >
            <span
              v-if="isCreating"
              class="loading loading-spinner loading-xs"
            />
            {{ t('mcp.create') }}
          </button>
        </div>
      </form>

      <div
        v-if="isLoading"
        class="flex justify-center py-4"
      >
        <span class="loading loading-spinner loading-md" />
      </div>
      <div
        v-else-if="tokens.length > 0"
        class="flex flex-col gap-2"
        data-testid="mcp-token-list"
      >
        <div
          v-for="token in tokens"
          :key="token.id"
          class="flex items-center gap-3 rounded-box border border-base-300 p-3"
          data-testid="mcp-token-row"
        >
          <div class="min-w-0 flex-1 space-y-1">
            <div
              class="break-all font-medium"
              data-testid="mcp-token-name"
            >
              {{ token.name }}
            </div>
            <div class="flex flex-wrap gap-1">
              <span
                v-for="scope in token.scopes"
                :key="scope"
                class="badge badge-sm badge-ghost"
                data-testid="mcp-token-scope"
              >
                {{ t(`mcp.scopes.${scope}`) }}
              </span>
            </div>
            <div class="text-xs text-base-content/60">
              {{ t('mcp.createdAt', { date: formatDate(token.createdAt) }) }}
              ·
              <span data-testid="mcp-token-last-used">
                {{ token.lastUsedAt ? t('mcp.lastUsedAt', { date: formatDate(token.lastUsedAt) }) : t('mcp.neverUsed') }}
              </span>
            </div>
          </div>
          <button
            type="button"
            class="btn btn-sm btn-error flex-shrink-0"
            :disabled="revokingId === token.id"
            :aria-label="t('mcp.revokeConfirm')"
            data-testid="mcp-token-revoke-btn"
            @click="revokeToken(token)"
          >
            <span
              v-if="revokingId === token.id"
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
import { createMcpTokenSchema, MCP_SCOPES, MCP_TOKEN_NAME_MAX_LENGTH, type McpScope } from '~~/shared/schemas/mcp'
import type { CreatedMcpToken, McpTokensData, McpTokenSummary } from '~~/shared/types/mcp'
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
const { confirmDiscardChanges } = useUnsavedChanges()
const requestUrl = useRequestURL()

const tokens = ref<McpTokenSummary[]>([])
const createdToken = ref<CreatedMcpToken | null>(null)
const name = ref('')
const scopes = ref<McpScope[]>([...MCP_SCOPES])
const isLoading = ref(false)
const isCreating = ref(false)
const revokingId = ref<string | null>(null)

const command = computed((): string => createdToken.value
  ? `claude mcp add --transport http --scope user dom-cash ${requestUrl.origin}/api/mcp --header "Authorization: Bearer ${createdToken.value.secret}"`
  : '')

const canCreate = computed((): boolean =>
  !isCreating.value && createMcpTokenSchema.safeParse({ name: name.value, scopes: scopes.value }).success)

const formatDate = (value: string): string => new Date(value).toLocaleDateString(locale.value)

const resetForm = (): void => {
  createdToken.value = null
  name.value = ''
  scopes.value = [...MCP_SCOPES]
}

const loadTokens = async (): Promise<void> => {
  isLoading.value = true

  try {
    tokens.value = (await $fetch<McpTokensData>('/api/user/mcp-tokens')).tokens
  }
  catch (error) {
    toast({ type: 'error', message: formatError(error, t('mcp.loadError')) })
  }
  finally {
    isLoading.value = false
  }
}

const createToken = async (): Promise<void> => {
  const payload = createMcpTokenSchema.safeParse({ name: name.value, scopes: scopes.value })

  if (!payload.success || isCreating.value) {
    return
  }

  isCreating.value = true

  try {
    const created = await $fetch<CreatedMcpToken>('/api/user/mcp-tokens', { method: 'POST', body: payload.data })
    createdToken.value = created
    tokens.value = [created.token, ...tokens.value]
    name.value = ''
  }
  catch (error) {
    toast({ type: 'error', message: formatError(error, t('mcp.createError')) })
  }
  finally {
    isCreating.value = false
  }
}

const revokeToken = async (token: McpTokenSummary): Promise<void> => {
  const confirmed = await confirm({
    title: t('mcp.revokeTitle'),
    message: [t('mcp.revokeMessage'), { text: token.name, isBold: true }],
    variant: 'danger',
    confirmText: t('mcp.revokeConfirm'),
    cancelText: t('common.cancel'),
  })

  if (!confirmed) {
    return
  }

  revokingId.value = token.id

  try {
    await $fetch(`/api/user/mcp-tokens/${encodeURIComponent(token.id)}`, { method: 'DELETE' })
    tokens.value = tokens.value.filter(({ id }) => id !== token.id)

    if (createdToken.value?.token.id === token.id) {
      createdToken.value = null
    }
  }
  catch (error) {
    toast({ type: 'error', message: formatError(error, t('mcp.revokeError')) })
  }
  finally {
    revokingId.value = null
  }
}

const copy = async (text: string): Promise<void> => {
  const isCopied = await copyText(text)
  toast(isCopied ? { type: 'success', message: t('mcp.copied') } : { type: 'error', message: t('mcp.copyError') })
}

const hide = async (): Promise<void> => {
  if (!(await confirmDiscardChanges(name.value.trim() !== '', 'close'))) {
    return
  }

  emit('close')
}

watch(() => props.isOpen, async (open) => {
  if (open) {
    resetForm()
    await loadTokens()
  }
})
</script>
