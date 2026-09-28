<script setup lang="ts">
import { TEMPORARY_REGISTRATION_MINUTES, type RegistrationMode } from '~~/shared/schemas/auth'
import type { RegistrationState } from '~~/shared/types'

type ModeStyle = {
  icon: string
  iconClass: string
  toggleClass: string
}

const SECONDS_IN_MINUTE = 60
const MILLISECONDS_IN_SECOND = 1000
const TEMPORARY_REGISTRATION_SECONDS = TEMPORARY_REGISTRATION_MINUTES * SECONDS_IN_MINUTE

const EXPECTED_STATES: Record<RegistrationMode, RegistrationState> = {
  open: { isOpen: true, closesInSeconds: null },
  closed: { isOpen: false, closesInSeconds: null },
  temporary: { isOpen: true, closesInSeconds: TEMPORARY_REGISTRATION_SECONDS },
}

const MODE_STYLES: Record<RegistrationMode, ModeStyle> = {
  open: {
    icon: 'heroicons:lock-open',
    iconClass: 'bg-success/15 text-success',
    toggleClass: 'toggle-success',
  },
  temporary: {
    icon: 'heroicons:clock',
    iconClass: 'bg-warning/15 text-warning',
    toggleClass: 'toggle-warning',
  },
  closed: {
    icon: 'heroicons:lock-closed',
    iconClass: 'bg-base-200 text-base-content/60',
    toggleClass: 'toggle-success',
  },
}

const { t } = useI18n()
const { formatError } = useServerError()
const { toast } = useToast()

const { data: registration } = await useFetch<RegistrationState>('/api/admin/registration')

const isSaving = ref(false)
const closesAt = ref<number | null>(null)
const clientNow = ref<number | null>(null)

const mode = computed((): RegistrationMode => {
  if (!registration.value?.isOpen) {
    return 'closed'
  }

  return registration.value.closesInSeconds === null ? 'open' : 'temporary'
})

const modeStyle = computed(() => MODE_STYLES[mode.value])

const secondsLeft = computed((): number | null => {
  const closesInSeconds = registration.value?.closesInSeconds ?? null

  if (closesInSeconds === null || closesAt.value === null || clientNow.value === null) {
    return closesInSeconds
  }

  return Math.max(0, Math.ceil((closesAt.value - clientNow.value) / MILLISECONDS_IN_SECOND))
})

const formatCountdown = (totalSeconds: number): string => {
  const minutes = Math.floor(totalSeconds / SECONDS_IN_MINUTE)
  const seconds = totalSeconds % SECONDS_IN_MINUTE

  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

const statusText = computed((): string => {
  if (mode.value === 'open') {
    return t('metrics.registrationOpen')
  }

  if (mode.value === 'closed') {
    return t('metrics.registrationClosed')
  }

  return t('metrics.registrationClosesIn', { time: formatCountdown(secondsLeft.value ?? 0) })
})

const changeRegistration = async (nextMode: RegistrationMode): Promise<void> => {
  const previousState = registration.value
  registration.value = { ...EXPECTED_STATES[nextMode] }
  isSaving.value = true

  try {
    registration.value = await $fetch<RegistrationState>('/api/admin/registration', {
      method: 'PUT',
      body: { mode: nextMode },
    })
  }
  catch (error: unknown) {
    registration.value = previousState
    toast({ type: 'error', message: formatError(error, t('metrics.registrationUpdateError')) })
  }
  finally {
    isSaving.value = false
  }
}

const isOpen = computed({
  get: () => registration.value?.isOpen ?? false,
  set: (value: boolean) => {
    changeRegistration(value ? 'open' : 'closed')
  },
})

const toClosesAt = (state: RegistrationState | undefined): number | null => {
  const closesInSeconds = state?.closesInSeconds ?? null

  return closesInSeconds === null ? null : Date.now() + closesInSeconds * MILLISECONDS_IN_SECOND
}

watch(registration, (state) => {
  closesAt.value = toClosesAt(state)
}, { immediate: true })

watch(secondsLeft, (seconds) => {
  if (seconds === 0) {
    registration.value = { ...EXPECTED_STATES.closed }
  }
})

const tick = (): void => {
  clientNow.value = Date.now()
}

let ticker: ReturnType<typeof setInterval> | undefined

onMounted(() => {
  tick()
  ticker = setInterval(tick, MILLISECONDS_IN_SECOND)
})

onBeforeUnmount(() => {
  clearInterval(ticker)
})
</script>

<template>
  <section
    v-if="registration"
    class="bg-base-100 p-4 sm:p-6 rounded-lg shadow-md border border-base-300 mb-6 animate-fade-in-up-delayed"
    data-testid="registration-switch"
  >
    <div class="flex flex-wrap items-center gap-x-4 gap-y-3">
      <div
        class="flex size-12 shrink-0 items-center justify-center rounded-full transition-colors duration-300"
        :class="modeStyle.iconClass"
      >
        <Icon
          :name="modeStyle.icon"
          size="24"
        />
      </div>

      <div class="min-w-0 flex-1">
        <h2 class="text-lg font-semibold">
          {{ t('metrics.registrationTitle') }}
        </h2>
        <p
          class="text-sm opacity-70 tabular-nums"
          data-testid="registration-status"
        >
          {{ statusText }}
        </p>
      </div>

      <button
        v-if="mode !== 'open'"
        type="button"
        class="btn btn-sm btn-outline order-last w-full sm:order-none sm:w-auto"
        :disabled="isSaving"
        data-testid="registration-open-temporarily"
        @click="changeRegistration('temporary')"
      >
        <Icon
          name="heroicons:clock"
          size="16"
        />
        {{ t('metrics.registrationOpenFor', { count: TEMPORARY_REGISTRATION_MINUTES }, TEMPORARY_REGISTRATION_MINUTES) }}
      </button>

      <input
        v-model="isOpen"
        type="checkbox"
        class="toggle"
        :class="[modeStyle.toggleClass, { 'pointer-events-none': isSaving }]"
        :aria-label="t('metrics.registrationToggle')"
        data-testid="registration-toggle"
      >
    </div>

    <Transition name="fade-up">
      <progress
        v-if="secondsLeft !== null"
        class="progress progress-warning mt-4 w-full"
        :value="secondsLeft"
        :max="TEMPORARY_REGISTRATION_SECONDS"
        data-testid="registration-countdown"
      />
    </Transition>
  </section>
</template>
