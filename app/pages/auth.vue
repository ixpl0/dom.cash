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
          v-if="!showVerificationStep"
          class="space-y-4"
          @submit.prevent="handleSubmit"
        >
          <div class="form-control">
            <label class="label mb-2">
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
              autocomplete="email"
              data-testid="email-input"
            >
            <label
              v-if="errors.username"
              class="label"
            >
              <span class="label-text-alt text-error">{{ errors.username }}</span>
            </label>
          </div>

          <div class="form-control">
            <label class="label mb-2">
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

          <div class="form-control mt-6 space-y-2">
            <button
              type="submit"
              class="btn btn-primary w-full"
              :disabled="isLoading"
              data-testid="login-btn"
            >
              <span
                v-if="isLoading"
                class="loading loading-spinner loading-sm"
              />
              {{ isLoading ? t('auth.loggingIn') : t('auth.loginButton') }}
            </button>

            <button
              type="button"
              class="btn btn-outline w-full"
              :disabled="isLoading"
              data-testid="register-btn"
              @click="handleRegister"
            >
              {{ t('auth.registerButton') }}
            </button>
          </div>
        </form>

        <form
          v-else
          class="space-y-4"
          @submit.prevent="handleVerifyCode"
        >
          <div class="space-y-2">
            <div class="alert alert-info">
              <div class="flex flex-col gap-2">
                <div>
                  {{ t('auth.verificationCodeSent') }}: {{ formData.username }}
                </div>
                <div>
                  {{ t('auth.checkSpamFolder') }}
                </div>
                <div v-if="attemptCount > 1">
                  {{ t('auth.checkSpamAndDelay') }}
                </div>
              </div>
            </div>

            <div
              v-if="attemptCount === 3"
              class="alert alert-warning text-sm"
            >
              <span>{{ t('auth.lastAttemptSent') }}</span>
            </div>
          </div>

          <div class="form-control">
            <label class="label mb-2">
              <span class="label-text">{{ t('auth.verificationCode') }}</span>
            </label>
            <input
              v-model="verificationCode"
              type="text"
              inputmode="numeric"
              :placeholder="t('auth.verificationCodePlaceholder')"
              class="input input-bordered w-full"
              :class="{ 'input-error': errors.code }"
              required
              maxlength="6"
              :disabled="isLoading"
              data-testid="verification-code-input"
            >
            <label
              v-if="errors.code"
              class="label"
            >
              <span class="label-text-alt text-error">{{ errors.code }}</span>
            </label>
          </div>

          <div class="form-control mt-6 space-y-2">
            <button
              type="submit"
              class="btn btn-primary w-full"
              :disabled="isLoading"
              data-testid="verify-code-btn"
            >
              <span
                v-if="isLoading"
                class="loading loading-spinner loading-sm"
              />
              {{ isLoading ? t('auth.verifyingCode') : t('auth.registerButton') }}
            </button>

            <button
              v-if="attemptCount < 3"
              type="button"
              class="btn btn-outline btn-sm w-full"
              :disabled="isLoading || resendTimer > 0"
              @click="handleResendCode"
            >
              <span v-if="resendTimer > 0">
                {{ t('auth.resendCodeIn', { seconds: resendTimer }) }}
              </span>
              <span v-else>
                {{ t('auth.resendCode') }}
              </span>
            </button>

            <button
              type="button"
              class="btn btn-ghost btn-sm w-full"
              :disabled="isLoading"
              @click="backToEmailStep"
            >
              {{ t('auth.backToEmail') }}
            </button>
          </div>
        </form>

        <div
          v-if="!showVerificationStep"
          class="divider"
        >
          {{ t('common.or') }}
        </div>

        <div
          v-if="!showVerificationStep"
          class="space-y-4"
        >
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
  code?: string
}

const { login } = useAuth()
const router = useRouter()
const route = useRoute()
const { t } = useI18n()

const formData = ref<FormData>({
  username: '',
  password: '',
})

const verificationCode = ref('')
const showVerificationStep = ref(false)
const errors = ref<FormErrors>({})
const isLoading = ref(false)
const isGoogleLoading = ref(false)
const { toast } = useToast()
const resendTimer = ref(0)
const attemptCount = ref(0)
const emailVerificationDisabled = ref(false)

const RESEND_DELAYS = [90, 180]

const nextResendDelay = computed(() => {
  return RESEND_DELAYS[attemptCount.value - 1] || 180
})

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

const validateVerificationCode = (): boolean => {
  const newErrors: FormErrors = {}

  if (!/^\d{6}$/.test(verificationCode.value)) {
    newErrors.code = t('auth.verificationCodeInvalid')
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

const startResendTimer = (seconds: number) => {
  resendTimer.value = seconds
  const interval = setInterval(() => {
    resendTimer.value -= 1
    if (resendTimer.value <= 0) {
      clearInterval(interval)
    }
  }, 1000)
}

const handleRegister = async (): Promise<void> => {
  if (!validateForm()) {
    return
  }

  isLoading.value = true

  try {
    if (emailVerificationDisabled.value) {
      const response = await $fetch<{ id: string, username: string, mainCurrency: string }>('/api/auth/register-direct', {
        method: 'POST',
        body: {
          email: formData.value.username,
          password: formData.value.password,
          mainCurrency: 'USD',
        },
      })

      const auth = useAuth()
      auth.setUser(response)

      if (import.meta.client) {
        localStorage.setItem('hasSession', 'true')
      }

      await navigateAfterLogin()
    }
    else {
      const response = await $fetch<{ success: boolean, attemptCount: number }>('/api/auth/send-code', {
        method: 'POST',
        body: {
          email: formData.value.username,
        },
      })

      attemptCount.value = response.attemptCount
      showVerificationStep.value = true
      toast({ type: 'success', message: t('auth.verificationCodeSent') })

      if (response.attemptCount < 3) {
        startResendTimer(nextResendDelay.value)
      }
    }
  }
  catch (error) {
    const errorData = (error as { data?: { statusCode?: number, data?: { waitSeconds?: number, attemptCount?: number } } })?.data

    if (errorData?.statusCode === 429 && errorData.data?.waitSeconds) {
      startResendTimer(errorData.data.waitSeconds)
      toast({ type: 'error', message: t('auth.pleaseWait', { seconds: errorData.data.waitSeconds }) })
    }
    else {
      toast({ type: 'error', message: getErrorMessage(error, t('auth.unexpectedError')) })
    }
  }
  finally {
    isLoading.value = false
  }
}

const handleVerifyCode = async (): Promise<void> => {
  if (!validateVerificationCode()) {
    return
  }

  isLoading.value = true

  try {
    const response = await $fetch<{ id: string, username: string, mainCurrency: string }>('/api/auth/verify-code', {
      method: 'POST',
      body: {
        email: formData.value.username,
        code: verificationCode.value,
        password: formData.value.password,
        mainCurrency: 'USD',
      },
    })

    const auth = useAuth()
    auth.setUser(response)

    if (import.meta.client) {
      localStorage.setItem('hasSession', 'true')
    }

    await navigateAfterLogin()
  }
  catch (error) {
    toast({ type: 'error', message: getErrorMessage(error, t('auth.unexpectedError')) })
  }
  finally {
    isLoading.value = false
  }
}

const handleResendCode = async (): Promise<void> => {
  if (resendTimer.value > 0 || attemptCount.value >= 3) {
    return
  }

  isLoading.value = true

  try {
    const response = await $fetch<{ success: boolean, attemptCount: number }>('/api/auth/send-code', {
      method: 'POST',
      body: {
        email: formData.value.username,
      },
    })

    attemptCount.value = response.attemptCount
    toast({ type: 'success', message: t('auth.verificationCodeSent') })

    if (response.attemptCount < 3) {
      startResendTimer(nextResendDelay.value)
    }
  }
  catch (error) {
    const errorData = (error as { data?: { statusCode?: number, data?: { waitSeconds?: number } } })?.data

    if (errorData?.statusCode === 429 && errorData.data?.waitSeconds) {
      startResendTimer(errorData.data.waitSeconds)
      toast({ type: 'error', message: t('auth.pleaseWait', { seconds: errorData.data.waitSeconds }) })
    }
    else {
      toast({ type: 'error', message: getErrorMessage(error, t('auth.unexpectedError')) })
    }
  }
  finally {
    isLoading.value = false
  }
}

const backToEmailStep = (): void => {
  showVerificationStep.value = false
  verificationCode.value = ''
  errors.value = {}
  resendTimer.value = 0
  attemptCount.value = 0
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

watch(verificationCode, () => {
  if (errors.value.code) {
    validateVerificationCode()
  }
})

onMounted(async () => {
  try {
    const config = await $fetch<{ emailVerificationDisabled: boolean }>('/api/auth/config')
    emailVerificationDisabled.value = config.emailVerificationDisabled
  }
  catch (error) {
    console.error('Failed to load auth config:', error)
  }

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
