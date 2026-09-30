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

        <div
          v-if="isRegistrationClosed && !showVerificationStep && !showForgotPasswordStep"
          role="status"
          class="alert alert-info alert-soft items-start mb-4"
          data-testid="registration-closed-notice"
        >
          <Icon
            name="heroicons:information-circle"
            size="24"
            class="shrink-0"
          />
          <div class="space-y-1">
            <p class="font-semibold">
              {{ t('auth.registrationClosedTitle') }}
            </p>
            <p class="text-sm">
              {{ t('auth.registrationClosedText') }}
            </p>
          </div>
        </div>

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
              <span class="label-text-alt text-error">{{ t(errors.username) }}</span>
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
              <span class="label-text-alt text-error">{{ t(errors.password) }}</span>
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
              v-if="!isRegistrationClosed"
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
              <span class="label-text-alt text-error">{{ t(errors.code) }}</span>
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
                <span class="label-text-alt text-error">{{ t(errors.username) }}</span>
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
                <span class="label-text-alt text-error">{{ t(errors.code) }}</span>
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
                <span class="label-text-alt text-error">{{ t(errors.password) }}</span>
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
            <UiGoogleLogo class="size-5" />
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
import type { CodeRequestResult } from '~~/shared/types'
import { getAuthFieldErrors, type AuthFieldErrors, type AuthFieldValues } from '~/utils/auth-validation'

const {
  login,
  registerWithoutCode,
  sendRegistrationCode,
  register,
  sendPasswordResetCode,
  resetPassword,
  loginWithGoogle,
  finishGoogleLogin,
} = useAuth()
const router = useRouter()
const route = useRoute()
const { t } = useI18n()
const { formatError } = useServerError()
const { toast } = useToast()

const { data: authConfig } = await useFetch('/api/auth/config')

const isRegistrationClosed = computed(() => authConfig.value?.registrationOpen === false)

const formData = ref({
  username: '',
  password: '',
})

const verificationCode = ref('')
const showVerificationStep = ref(false)
const showForgotPasswordStep = ref(false)
const forgotPasswordStep = ref(1)
const newPassword = ref('')
const errors = ref<AuthFieldErrors>({})
const isLoading = ref(false)
const isGoogleLoading = ref(false)

const redirectPath = computed<string | null>(() => {
  const { redirect } = route.query
  return typeof redirect === 'string' ? redirect : null
})

const shownFieldValues = computed((): AuthFieldValues => {
  if (showVerificationStep.value) {
    return { code: verificationCode.value }
  }
  if (showForgotPasswordStep.value) {
    return forgotPasswordStep.value === 1
      ? { username: formData.value.username }
      : { code: verificationCode.value, password: newPassword.value }
  }
  return { username: formData.value.username, password: formData.value.password }
})

const validate = (): boolean => {
  errors.value = getAuthFieldErrors(shownFieldValues.value)
  return Object.keys(errors.value).length === 0
}

const submit = async (action: () => Promise<void>): Promise<void> => {
  isLoading.value = true

  try {
    await action()
  }
  catch (error) {
    toast({ type: 'error', message: formatError(error, t('auth.unexpectedError')) })
  }
  finally {
    isLoading.value = false
  }
}

const goHome = () => {
  return router.push('/')
}

const navigateAfterLogin = async (): Promise<void> => {
  await router.push(redirectPath.value ?? '/')
}

const showCodeRequestResult = (result: CodeRequestResult, sentMessage: string): void => {
  if (result.alreadySent) {
    const time = t('auth.codeAlreadySentTime', { count: result.waitMinutes }, result.waitMinutes)
    toast({ type: 'info', message: t('auth.codeAlreadySent', { time }) })
    return
  }

  toast({ type: 'success', message: sentMessage })
}

const handleSubmit = async (): Promise<void> => {
  if (!validate()) {
    return
  }

  await submit(async () => {
    await login(formData.value)
    await navigateAfterLogin()
  })
}

const handleRegister = async (): Promise<void> => {
  if (!validate()) {
    return
  }

  await submit(async () => {
    if (authConfig.value?.emailVerificationDisabled) {
      await registerWithoutCode(formData.value)
      await navigateAfterLogin()
      return
    }

    showCodeRequestResult(await sendRegistrationCode(formData.value.username), t('auth.verificationCodeSent'))
    showVerificationStep.value = true
  })
}

const handleVerifyCode = async (): Promise<void> => {
  if (!validate()) {
    return
  }

  await submit(async () => {
    await register(formData.value, verificationCode.value)
    await navigateAfterLogin()
  })
}

const handleResendCode = async (): Promise<void> => {
  await submit(async () => {
    showCodeRequestResult(await sendRegistrationCode(formData.value.username), t('auth.verificationCodeSent'))
  })
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
  if (!validate()) {
    return
  }

  await submit(async () => {
    showCodeRequestResult(await sendPasswordResetCode(formData.value.username), t('auth.emailSent'))
    forgotPasswordStep.value = 2
  })
}

const handleResetPassword = async (): Promise<void> => {
  if (!validate()) {
    return
  }

  await submit(async () => {
    await resetPassword(formData.value.username, verificationCode.value, newPassword.value)
    toast({ type: 'success', message: t('auth.passwordResetSuccess') })
    backToLoginFromForgot()
  })
}

const backToEmailStep = (): void => {
  showVerificationStep.value = false
  verificationCode.value = ''
  errors.value = {}
}

useBackHandler(showVerificationStep, (source) => {
  if (source === 'history' && !isLoading.value) {
    backToEmailStep()
  }
})

useBackHandler(showForgotPasswordStep, (source) => {
  if (source === 'history' && !isLoading.value) {
    backToLoginFromForgot()
  }
})

const handleGoogleLogin = async (): Promise<void> => {
  isGoogleLoading.value = true

  try {
    await loginWithGoogle()
  }
  catch (error) {
    isGoogleLoading.value = false
    toast({ type: 'error', message: formatError(error, t('auth.googleError')) })
  }
}

watch(shownFieldValues, () => {
  if (Object.keys(errors.value).length > 0) {
    validate()
  }
})

onMounted(async () => {
  const { code, state } = route.query

  if (typeof code !== 'string') {
    return
  }

  isGoogleLoading.value = true

  try {
    await router.push(await finishGoogleLogin(code, typeof state === 'string' ? state : ''))
  }
  catch (error) {
    console.error('Google OAuth redirect failed:', error)
    toast({ type: 'error', message: formatError(error, t('auth.googleOAuthError')) })
  }
  finally {
    isGoogleLoading.value = false
  }
})

definePageMeta({ layout: false })
</script>
