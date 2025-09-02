<template>
  <div class="min-h-screen bg-base-100 flex items-center justify-center p-4">
    <div class="card w-full max-w-md bg-base-200 shadow-xl">
      <div class="card-body">
        <h2 class="card-title justify-center text-3xl mb-6">
          Добро пожаловать
        </h2>

        <form
          class="space-y-4"
          @submit.prevent="handleSubmit"
        >
          <div class="form-control">
            <label class="label">
              <span class="label-text">Имя пользователя</span>
            </label>
            <input
              v-model="formData.username"
              type="text"
              placeholder="Введите имя пользователя"
              class="input input-bordered w-full"
              :class="{ 'input-error': errors.username }"
              required
              minlength="3"
              maxlength="64"
              :disabled="isLoading"
              autocomplete="username"
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
              <span class="label-text">Пароль</span>
            </label>
            <input
              v-model="formData.password"
              type="password"
              placeholder="Введите пароль"
              class="input input-bordered w-full"
              :class="{ 'input-error': errors.password }"
              required
              minlength="8"
              maxlength="100"
              :disabled="isLoading"
              autocomplete="current-password"
            >
            <label
              v-if="errors.password"
              class="label"
            >
              <span class="label-text-alt text-error">{{ errors.password }}</span>
            </label>
          </div>

          <div
            v-if="apiError"
            class="alert alert-error"
          >
            {{ apiError }}
          </div>

          <div class="form-control mt-6">
            <button
              type="submit"
              class="btn btn-primary w-full"
              :disabled="isLoading"
            >
              <span
                v-if="isLoading"
                class="loading loading-spinner loading-sm"
              />
              {{ isLoading ? 'Входим...' : 'Войти / Зарегистрироваться' }}
            </button>
          </div>
        </form>

        <div class="divider">
          или
        </div>

        <div class="space-y-4">
          <button
            type="button"
            class="btn btn-outline w-full"
            :disabled="isLoading || isGoogleLoading"
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
            {{ isGoogleLoading ? 'Входим через Google...' : 'Войти через Google' }}
          </button>

          <div class="text-center space-y-2">
            <button
              type="button"
              class="btn btn-ghost btn-sm"
              @click="goHome"
            >
              На главную
            </button>

            <p class="text-sm opacity-70">
              Если у вас нет аккаунта, он будет создан автоматически
            </p>
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
}

const { login } = useAuth()
const router = useRouter()
const route = useRoute()

const formData = ref<FormData>({
  username: '',
  password: '',
})

const errors = ref<FormErrors>({})
const apiError = ref<string>('')
const isLoading = ref(false)
const isGoogleLoading = ref(false)

const redirectPath = computed<string | null>(() => {
  const { redirect } = route.query
  return typeof redirect === 'string' ? redirect : null
})

const validateForm = (): boolean => {
  const newErrors: FormErrors = {}

  if (formData.value.username.length < 3) {
    newErrors.username = 'Имя пользователя должно содержать минимум 3 символа'
  }
  else if (formData.value.username.length > 64) {
    newErrors.username = 'Имя пользователя не должно превышать 64 символа'
  }

  if (formData.value.password.length < 8) {
    newErrors.password = 'Пароль должен содержать минимум 8 символов'
  }
  else if (formData.value.password.length > 100) {
    newErrors.password = 'Пароль не должен превышать 100 символов'
  }

  errors.value = newErrors
  return Object.keys(newErrors).length === 0
}

const handleSubmit = async (): Promise<void> => {
  apiError.value = ''

  if (!validateForm()) {
    return
  }

  isLoading.value = true

  try {
    await login({
      username: formData.value.username,
      password: formData.value.password,
    })

    if (redirectPath.value) {
      await router.push(redirectPath.value)
    }
  }
  catch (error) {
    if (error instanceof Error) {
      apiError.value = error.message
    }
    else {
      apiError.value = 'Произошла неожиданная ошибка'
    }
  }
  finally {
    isLoading.value = false
  }
}

const goHome = (): void => {
  router.push('/')
}

const handleGoogleLogin = async (): Promise<void> => {
  try {
    isGoogleLoading.value = true
    apiError.value = ''

    const { loginWithGoogle } = useAuth()
    await loginWithGoogle()

    if (redirectPath.value) {
      await router.push(redirectPath.value)
    }
  }
  catch (error) {
    if (error instanceof Error) {
      apiError.value = error.message
    }
    else {
      apiError.value = 'Произошла ошибка при входе через Google'
    }
  }
  finally {
    isGoogleLoading.value = false
  }
}

watch(formData, () => {
  if (Object.keys(errors.value).length > 0) {
    validateForm()
  }
  if (apiError.value) {
    apiError.value = ''
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
      if (error instanceof Error) {
        apiError.value = error.message
      }
      else {
        apiError.value = 'Ошибка при обработке Google OAuth'
      }
    }
    finally {
      isGoogleLoading.value = false
    }
  }
})

definePageMeta({ layout: false })
</script>
