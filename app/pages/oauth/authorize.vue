<template>
  <div class="container mx-auto flex justify-center px-4 py-10">
    <div
      class="card w-full max-w-md bg-base-200 shadow"
      data-testid="oauth-consent"
    >
      <div class="card-body gap-4">
        <template v-if="details">
          <h1
            class="card-title text-xl"
            data-testid="oauth-title"
          >
            {{ t('oauth.title', { client: details.clientName }) }}
          </h1>
          <p class="break-all text-sm text-base-content/70">
            {{ t('oauth.signedInAs', { username: user?.username ?? '' }) }}
          </p>
          <div class="space-y-2">
            <p class="font-medium">
              {{ t('oauth.scopesLabel') }}
            </p>
            <label
              v-for="scope in details.scopes"
              :key="scope"
              class="flex cursor-pointer items-center gap-2"
            >
              <input
                v-model="grantedScopes"
                type="checkbox"
                :value="scope"
                class="checkbox checkbox-sm"
                :data-testid="`oauth-scope-${scope}`"
              >
              <span>{{ t(`mcp.scopes.${scope}`) }}</span>
            </label>
          </div>
          <p class="text-sm text-base-content/70">
            {{ t('oauth.readOnly') }}
          </p>
          <p
            class="text-sm text-base-content/70"
            data-testid="oauth-redirect-host"
          >
            {{ t('oauth.returnTo', { host: details.redirectHost }) }}
          </p>
          <div class="card-actions justify-end">
            <button
              type="button"
              class="btn btn-ghost"
              :disabled="isSending"
              data-testid="oauth-deny-btn"
              @click="decide(false)"
            >
              {{ t('oauth.deny') }}
            </button>
            <button
              type="button"
              class="btn btn-primary"
              :disabled="isSending || grantedScopes.length === 0"
              data-testid="oauth-allow-btn"
              @click="decide(true)"
            >
              <span
                v-if="isSending"
                class="loading loading-spinner loading-xs"
              />
              {{ t('oauth.allow') }}
            </button>
          </div>
        </template>
        <p
          v-else
          class="text-error"
          data-testid="oauth-error"
        >
          {{ errorMessage }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { oauthAuthorizationRequestSchema, type McpScope } from '~~/shared/schemas/mcp'
import type { OAuthAuthorizationDetails, OAuthDecisionResult } from '~~/shared/types/mcp'

const route = useRoute()
const { t } = useI18n()
const { user } = useAuthState()
const { toast } = useToast()
const { formatError } = useServerError()

const parsedRequest = oauthAuthorizationRequestSchema.safeParse(route.query)
const authorizationRequest = parsedRequest.success ? parsedRequest.data : null

const { data: details, error: loadError } = await useFetch<OAuthAuthorizationDetails>('/api/oauth/authorization', {
  query: authorizationRequest ?? {},
  immediate: authorizationRequest !== null,
})

const grantedScopes = ref<McpScope[]>([])
const isSending = ref(false)

const errorMessage = computed((): string => loadError.value
  ? formatError(loadError.value, t('oauth.loadError'))
  : t('serverErrors.oauth_invalid_request'))

const decide = async (isApproved: boolean): Promise<void> => {
  if (!authorizationRequest || isSending.value) {
    return
  }

  isSending.value = true

  try {
    const { redirectUrl } = await $fetch<OAuthDecisionResult>('/api/oauth/authorization', {
      method: 'POST',
      body: { request: authorizationRequest, grantedScopes: grantedScopes.value, isApproved },
    })
    await navigateTo(redirectUrl, { external: true })
  }
  catch (error) {
    toast({ type: 'error', message: formatError(error, t('oauth.decisionError')) })
    isSending.value = false
  }
}

watch(details, (loadedDetails) => {
  grantedScopes.value = loadedDetails ? [...loadedDetails.scopes] : []
}, { immediate: true })
</script>
