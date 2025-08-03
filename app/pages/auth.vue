<template>
  <div class="min-h-screen bg-base-100 flex items-center justify-center p-4">
    <div class="card w-full max-w-md bg-base-200 shadow-xl">
      <div class="card-body">
        <h2 class="card-title justify-center text-3xl mb-6">
          💰 Добро пожаловать
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
              maxlength="20"
              :disabled="isLoading"
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
              minlength="6"
              maxlength="100"
              :disabled="isLoading"
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
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="stroke-current shrink-0 h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>{{ apiError }}</span>
          </div>

          <div class="form-control mt-6">
            <button
              type="submit"
              class="btn btn-primary"
              :disabled="isLoading || !isFormValid"
            >
              <span
                v-if="isLoading"
                class="loading loading-spinner loading-sm"
              />
              {{ isLoading ? 'Входим...' : 'Войти' }}
            </button>
          </div>
        </form>

        <div class="divider">
          или
        </div>

        <div class="text-center space-y-2">
          <div class="mb-4">
            <button
              type="button"
              class="btn btn-ghost btn-sm"
              @click="goHome"
            >
              🏠 На главную
            </button>
          </div>

          <p class="text-sm opacity-70">
            Если у вас нет аккаунта, он будет создан автоматически
          </p>
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

const isFormValid = computed(() =>
  formData.value.username.length >= 3
  && formData.value.password.length >= 6
  && !Object.keys(errors.value).length,
)

const redirectPath = computed<string | null>(() => {
  const { redirect } = route.query
  return typeof redirect === 'string' ? redirect : null
})

const validateForm = (): boolean => {
  const newErrors: FormErrors = {}

  if (formData.value.username.length < 3) {
    newErrors.username = 'Имя пользователя должно содержать минимум 3 символа'
  }
  else if (formData.value.username.length > 20) {
    newErrors.username = 'Имя пользователя не должно превышать 20 символов'
  }
  else if (!/^[a-zA-Z0-9_]+$/.test(formData.value.username)) {
    newErrors.username = 'Имя пользователя может содержать только буквы, цифры и подчеркивания'
  }

  if (formData.value.password.length < 6) {
    newErrors.password = 'Пароль должен содержать минимум 6 символов'
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
    const result = await login({
      username: formData.value.username,
      password: formData.value.password,
    })

    if (result.success) {
      await router.push(redirectPath.value ?? '/')
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

watch(formData, () => {
  if (Object.keys(errors.value).length > 0) {
    validateForm()
  }
  if (apiError.value) {
    apiError.value = ''
  }
}, { deep: true })

definePageMeta({ layout: false })
</script>
