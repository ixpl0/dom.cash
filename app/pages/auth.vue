<template>
  <div class="min-h-screen bg-base-100 flex items-center justify-center p-4">
    <AppToast />
    <div class="card w-full max-w-md bg-base-200 shadow-xl">
      <div class="card-body">
        <h2
          class="card-title justify-center text-3xl mb-6"
          data-testid="welcome-text"
        >
          {{ showForgotPasswordStep ? t('auth.resetPassword') : t('auth.welcome') }}
        </h2>

        <form
          v-if="!showVerificationStep && !showForgotPasswordStep"
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

          <div class="text-center">
            <a
              href="#"
              class="link link-hover text-sm"
              data-testid="forgot-password-link"
              @click.prevent="startForgotPassword"
            >
              {{ t('auth.forgotPassword') }}
            </a>
          </div>

          <div class="form-control mt-4 space-y-2">
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
          v-else-if="showVerificationStep"
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
              </div>
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
              type="button"
              class="btn btn-outline btn-sm w-full"
              :disabled="isLoading"
              @click="handleResendCode"
            >
              {{ t('auth.resendCode') }}
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

        <form
          v-else-if="showForgotPasswordStep"
          class="space-y-4"
          data-testid="forgot-password-form"
          @submit.prevent="forgotPasswordStep === 1 ? handleForgotPassword() : handleResetPassword()"
        >
          <div v-if="forgotPasswordStep === 1">
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
                data-testid="forgot-password-email-input"
              >
              <label
                v-if="errors.username"
                class="label"
              >
                <span class="label-text-alt text-error">{{ errors.username }}</span>
              </label>
            </div>

            <div class="form-control mt-6 space-y-2">
              <button
                type="submit"
                class="btn btn-primary w-full"
                :disabled="isLoading"
                data-testid="send-reset-code-btn"
              >
                <span
                  v-if="isLoading"
                  class="loading loading-spinner loading-sm"
                />
                {{ isLoading ? t('auth.sendingCode') : t('auth.sendResetCode') }}
              </button>

              <button
                type="button"
                class="btn btn-ghost btn-sm w-full"
                :disabled="isLoading"
                data-testid="back-to-login-btn"
                @click="backToLoginFromForgot"
              >
                {{ t('auth.backToLogin') }}
              </button>
            </div>
          </div>

          <div v-else>
            <div class="space-y-2">
              <div class="alert alert-info">
                <div class="flex flex-col gap-2">
                  <div>
                    {{ t('auth.emailSent') }}
                  </div>
                  <div>
                    {{ t('auth.checkSpamFolder') }}
                  </div>
                </div>
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
                data-testid="reset-code-input"
              >
              <label
                v-if="errors.code"
                class="label"
              >
                <span class="label-text-alt text-error">{{ errors.code }}</span>
              </label>
            </div>

            <div class="form-control">
              <label class="label mb-2">
                <span class="label-text">{{ t('auth.newPassword') }}</span>
              </label>
              <input
                v-model="newPassword"
                type="password"
                :placeholder="t('auth.newPasswordPlaceholder')"
                class="input input-bordered w-full"
                :class="{ 'input-error': errors.password }"
                required
                minlength="8"
                maxlength="100"
                :disabled="isLoading"
                autocomplete="new-password"
                data-testid="new-password-input"
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
                data-testid="reset-password-btn"
              >
                <span
                  v-if="isLoading"
                  class="loading loading-spinner loading-sm"
                />
                {{ isLoading ? t('auth.verifyingCode') : t('auth.resetPassword') }}
              </button>

              <button
                type="button"
                class="btn btn-ghost btn-sm w-full"
                :disabled="isLoading"
                data-testid="back-to-login-from-reset-btn"
                @click="backToLoginFromForgot"
              >
                {{ t('auth.backToLogin') }}
              </button>
            </div>
          </div>
        </form>

        <div
          v-if="!showVerificationStep && !showForgotPasswordStep"
          class="divider"
        >
          {{ t('common.or') }}
        </div>

        <div
          v-if="!showVerificationStep && !showForgotPasswordStep"
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
const { formatError } = useServerError()

const formData = ref<FormData>({
  username: '',
  password: '',
})

const verificationCode = ref('')
const showVerificationStep = ref(false)
const showForgotPasswordStep = ref(false)
const forgotPasswordStep = ref(1)
const newPassword = ref('')
const errors = ref<FormErrors>({})
const isLoading = ref(false)
const isGoogleLoading = ref(false)
const { toast } = useToast()
const emailVerificationDisabled = ref(false)

const redirectPath = computed<string | null>(() => {
  const { redirect } = route.query
  return typeof redirect === 'string' ? redirect : null
})

const validateForm = (skipPassword = false): boolean => {
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

  if (!skipPassword) {
    if (formData.value.password.length < 8) {
      newErrors.password = t('auth.passwordMinLength')
    }
    else if (formData.value.password.length > 100) {
      newErrors.password = t('auth.passwordMaxLength')
    }
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
    toast({ type: 'error', message: formatError(error, t('auth.unexpectedError')) })
  }
  finally {
    isLoading.value = false
  }
}

const handleRegister = async (): Promise<void> => {
  if (!validateForm()) {
    return
  }

  isLoading.value = true

  try {
    if (emailVerificationDisabled.value) {
      const response = await $fetch<{ id: string, username: string, mainCurrency: string, isAdmin: boolean }>('/api/auth/register-direct', {
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
      const response = await $fetch<{ success: boolean, alreadySent?: boolean, waitMinutes?: number }>('/api/auth/send-code', {
        method: 'POST',
        body: {
          email: formData.value.username,
        },
      })

      if (response.alreadySent && response.waitMinutes) {
        const timeText = t('auth.codeAlreadySentTime', { count: response.waitMinutes }, response.waitMinutes)
        toast({ type: 'info', message: t('auth.codeAlreadySent', { time: timeText }) })
      }
      else {
        showVerificationStep.value = true
        toast({ type: 'success', message: t('auth.verificationCodeSent') })
      }
    }
  }
  catch (error) {
    toast({ type: 'error', message: formatError(error, t('auth.unexpectedError')) })
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
    const response = await $fetch<{ id: string, username: string, mainCurrency: string, isAdmin: boolean }>('/api/auth/verify-code', {
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
    toast({ type: 'error', message: formatError(error, t('auth.unexpectedError')) })
  }
  finally {
    isLoading.value = false
  }
}

const handleResendCode = async (): Promise<void> => {
  if (showForgotPasswordStep.value) {
    return
  }

  isLoading.value = true

  try {
    const response = await $fetch<{ success: boolean, alreadySent?: boolean, waitMinutes?: number }>('/api/auth/send-code', {
      method: 'POST',
      body: {
        email: formData.value.username,
      },
    })

    if (response.alreadySent && response.waitMinutes) {
      const timeText = t('auth.codeAlreadySentTime', { count: response.waitMinutes }, response.waitMinutes)
      toast({ type: 'info', message: t('auth.codeAlreadySent', { time: timeText }) })
    }
    else {
      toast({ type: 'success', message: t('auth.verificationCodeSent') })
    }
  }
  catch (error) {
    toast({ type: 'error', message: formatError(error, t('auth.unexpectedError')) })
  }
  finally {
    isLoading.value = false
  }
}

const startForgotPassword = (): void => {
  showForgotPasswordStep.value = true
  forgotPasswordStep.value = 1
  errors.value = {}
}

const backToLoginFromForgot = (): void => {
  showForgotPasswordStep.value = false
  forgotPasswordStep.value = 1
  newPassword.value = ''
  verificationCode.value = ''
  errors.value = {}
}

const handleForgotPassword = async (): Promise<void> => {
  if (!validateForm(true)) {
    return
  }

  isLoading.value = true

  try {
    const response = await $fetch<{ success: boolean, alreadySent?: boolean, waitMinutes?: number }>('/api/auth/forgot-password', {
      method: 'POST',
      body: {
        email: formData.value.username,
      },
    })

    if (response.alreadySent && response.waitMinutes) {
      const timeText = t('auth.codeAlreadySentTime', { count: response.waitMinutes }, response.waitMinutes)
      toast({ type: 'info', message: t('auth.codeAlreadySent', { time: timeText }) })
    }
    else {
      forgotPasswordStep.value = 2
      toast({ type: 'success', message: t('auth.emailSent') })
    }
  }
  catch (error) {
    toast({ type: 'error', message: formatError(error, t('auth.unexpectedError')) })
  }
  finally {
    isLoading.value = false
  }
}

const handleResetPassword = async (): Promise<void> => {
  const newErrors: FormErrors = {}
  if (!/^\d{6}$/.test(verificationCode.value)) {
    newErrors.code = t('auth.verificationCodeInvalid')
  }
  if (newPassword.value.length < 8) {
    newErrors.password = t('auth.passwordMinLength')
  }

  if (Object.keys(newErrors).length > 0) {
    errors.value = newErrors
    return
  }

  isLoading.value = true

  try {
    await $fetch('/api/auth/reset-password', {
      method: 'POST',
      body: {
        email: formData.value.username,
        code: verificationCode.value,
        newPassword: newPassword.value,
      },
    })

    toast({ type: 'success', message: t('auth.passwordResetSuccess') })
    backToLoginFromForgot()
  }
  catch (error) {
    toast({ type: 'error', message: formatError(error, t('auth.unexpectedError')) })
  }
  finally {
    isLoading.value = false
  }
}

const backToEmailStep = (): void => {
  showVerificationStep.value = false
  verificationCode.value = ''
  errors.value = {}
}

const handleGoogleLogin = async (): Promise<void> => {
  try {
    isGoogleLoading.value = true

    const { loginWithGoogle } = useAuth()
    await loginWithGoogle()
    await navigateAfterLogin()
  }
  catch (error) {
    toast({ type: 'error', message: formatError(error, t('auth.googleError')) })
  }
  finally {
    isGoogleLoading.value = false
  }
}

watch(formData, () => {
  if (Object.keys(errors.value).length > 0) {
    validateForm(showForgotPasswordStep.value)
  }
}, { deep: true })

watch(newPassword, () => {
  if (errors.value.password) {
    if (newPassword.value.length < 8) {
      errors.value.password = t('auth.passwordMinLength')
    }
    else if (newPassword.value.length > 100) {
      errors.value.password = t('auth.passwordMaxLength')
    }
    else {
      delete errors.value.password
    }
  }
})

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
      toast({ type: 'error', message: formatError(error, t('auth.googleOAuthError')) })
    }
    finally {
      isGoogleLoading.value = false
    }
  }
})

definePageMeta({ layout: false })
</script>
