<template>
  <div class="min-h-screen bg-base-100 flex items-center justify-center p-4">
    <AppToast />
    <div class="card w-full max-w-md bg-base-200 shadow-xl">
      <div class="card-body">
        <h2
          class="card-title justify-center text-3xl mb-6"
          data-testid="welcome-text"
        >
          {{ t('auth.welcome') }}
        </h2>

        <form
          class="space-y-4"
          @submit.prevent="handleSubmit"
        >
          <div class="form-control">
            <label class="label">
              <span class="label-text">{{ t('auth.username') }}</span>
            </label>
            <input
              v-model="formData.username"
              type="email"
              :placeholder="t('auth.usernamePlaceholder')"
              class="input input-bordered w-full"
              :class="{ 'input-error': errors.username }"
              required
              minlength="3"
              maxlength="64"
              :disabled="isLoading"
              autocomplete="username"
              data-testid="username-input"
            >
            <label
              v-if="errors.username"
              class="label"
            >
              <span class="label-text-alt text-error">{{ errors.username }}</span>
            </label>
          </div>

          <div class="form-control">
            <label class="label">
              <span class="label-text">{{ t('auth.password') }}</span>
            </label>
            <input
              v-model="formData.password"
              type="password"
              :placeholder="t('auth.passwordPlaceholder')"
              class="input input-bordered w-full"
              :class="{ 'input-error': errors.password }"
              required
              minlength="8"
              maxlength="100"
              :disabled="isLoading"
              autocomplete="current-password"
              data-testid="password-input"
            >
            <label
              v-if="errors.password"
              class="label"
            >
              <span class="label-text-alt text-error">{{ errors.password }}</span>
            </label>
          </div>

          <div class="form-control mt-6">
            <button
              type="submit"
              class="btn btn-primary w-full"
              :disabled="isLoading"
              data-testid="submit-btn"
            >
              <span
                v-if="isLoading"
                class="loading loading-spinner loading-sm"
              />
              {{ isLoading ? t('auth.loggingIn') : t('auth.loginButton') }}
            </button>
          </div>
        </form>

        <div class="divider">
          {{ t('common.or') }}
        </div>

        <div class="space-y-4">
          <button
            type="button"
            class="btn btn-outline w-full"
            :disabled="isLoading || isGoogleLoading"
            data-testid="google-auth-btn"
            @click="handleGoogleLogin"
          >
            <Icon
              name="logos:google-icon"
              size="20"
            />
            <span
              v-if="isGoogleLoading"
              class="loading loading-spinner loading-sm"
            />
            {{ isGoogleLoading ? t('auth.googleLoggingIn') : t('auth.googleLogin') }}
          </button>

          <div class="text-center space-y-2">
            <button
              type="button"
              class="btn btn-ghost btn-sm"
              data-testid="home-btn"
              @click="goHome"
            >
              {{ t('auth.goHome') }}
            </button>

            <p
              class="text-sm opacity-70"
              data-testid="auto-register-text"
            >
              {{ t('auth.autoRegister') }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { getErrorMessage } from '~~/shared/utils/errors'

interface FormData {
  username: string
  password: string
}

interface FormErrors {
  username?: string
  password?: string
}

const { login } = useAuth()
const router = useRouter()
const route = useRoute()
const { t } = useI18n()

const formData = ref<FormData>({
  username: '',
  password: '',
})

const errors = ref<FormErrors>({})
const isLoading = ref(false)
const isGoogleLoading = ref(false)
const { toast } = useToast()

const redirectPath = computed<string | null>(() => {
  const { redirect } = route.query
  return typeof redirect === 'string' ? redirect : null
})

const validateForm = (): boolean => {
  const newErrors: FormErrors = {}

  const emailRegex = /^[a-zA-Z0-9]([a-zA-Z0-9+._-]*[a-zA-Z0-9])?@[a-zA-Z0-9]([a-zA-Z0-9.-]*[a-zA-Z0-9])?$/

  if (formData.value.username.length < 3) {
    newErrors.username = t('auth.usernameMinLength')
  }
  else if (formData.value.username.length > 64) {
    newErrors.username = t('auth.usernameMaxLength')
  }
  else if (!emailRegex.test(formData.value.username)) {
    newErrors.username = t('auth.usernameInvalid')
  }

  if (formData.value.password.length < 8) {
    newErrors.password = t('auth.passwordMinLength')
  }
  else if (formData.value.password.length > 100) {
    newErrors.password = t('auth.passwordMaxLength')
  }

  errors.value = newErrors
  return Object.keys(newErrors).length === 0
}

const goHome = () => {
  return router.push('/')
}

const navigateAfterLogin = async (): Promise<void> => {
  if (redirectPath.value) {
    await router.push(redirectPath.value)
  }
  else {
    await goHome()
  }
}

const handleSubmit = async (): Promise<void> => {
  if (!validateForm()) {
    return
  }

  isLoading.value = true

  try {
    await login({
      username: formData.value.username,
      password: formData.value.password,
    })

    await navigateAfterLogin()
  }
  catch (error) {
    toast({ type: 'error', message: getErrorMessage(error, t('auth.unexpectedError')) })
  }
  finally {
    isLoading.value = false
  }
}

const handleGoogleLogin = async (): Promise<void> => {
  try {
    isGoogleLoading.value = true

    const { loginWithGoogle } = useAuth()
    await loginWithGoogle()
    await navigateAfterLogin()
  }
  catch (error) {
    toast({ type: 'error', message: getErrorMessage(error, t('auth.googleError')) })
  }
  finally {
    isGoogleLoading.value = false
  }
}

watch(formData, () => {
  if (Object.keys(errors.value).length > 0) {
    validateForm()
  }
}, { deep: true })

onMounted(async () => {
  const urlParams = new URLSearchParams(window.location.search)
  const code = urlParams.get('code')
  const state = urlParams.get('state')

  if (code) {
    try {
      isGoogleLoading.value = true
      console.log('Processing Google OAuth redirect')

      const response = await $fetch<{
        user: User
        redirectTo: string
      }>(`/api/auth/google-redirect?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state || '')}`, {
        method: 'POST',
      })

      const auth = useAuth()
      auth.setUser(response.user)

      if (import.meta.client) {
        localStorage.setItem('hasSession', 'true')
      }

      await router.push(response.redirectTo)
    }
    catch (error) {
      console.error('Google OAuth redirect failed:', error)
      toast({ type: 'error', message: getErrorMessage(error, t('auth.googleOAuthError')) })
    }
    finally {
      isGoogleLoading.value = false
    }
  }
})

definePageMeta({ layout: false })
</script>
