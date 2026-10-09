<template>
  <UiDialog
    :is-open="isOpen"
    content-class="modal-box overflow-y-auto sm:max-w-lg"
    data-testid="todo-notifications-modal"
    :title="t('todo.notifications.title')"
    close-button-test-id="todo-notifications-close"
    @close="close"
  >
    <p class="text-sm text-base-content/70 mb-5">
      {{ t('todo.notifications.description') }}
    </p>

    <div
      v-if="notificationsStore.isLoading"
      class="flex justify-center py-6"
    >
      <span class="loading loading-spinner loading-md" />
    </div>

    <div
      v-else-if="notificationsStore.loadError"
      class="alert alert-error"
      data-testid="todo-notifications-load-error"
    >
      {{ formatError(notificationsStore.loadError, t('todo.notifications.errors.load')) }}
    </div>

    <div
      v-else-if="notificationsStore.permission === 'unsupported'"
      class="alert"
      data-testid="todo-notifications-unsupported"
    >
      {{ t('todo.notifications.unsupported') }}
    </div>

    <div
      v-else-if="!notificationsStore.publicKey"
      class="alert"
      data-testid="todo-notifications-not-configured"
    >
      {{ t('todo.notifications.notConfigured') }}
    </div>

    <div
      v-else
      class="flex flex-col gap-5"
    >
      <label class="flex items-center justify-between gap-4 cursor-pointer">
        <span class="font-medium">{{ t('todo.notifications.device') }}</span>
        <input
          type="checkbox"
          class="toggle toggle-primary"
          :checked="notificationsStore.isSubscribed"
          :disabled="notificationsStore.isBusy"
          data-testid="todo-notifications-device-toggle"
          @change="toggleDevice"
        >
      </label>

      <p
        v-if="notificationsStore.permission === 'denied'"
        class="text-sm text-warning"
        data-testid="todo-notifications-denied"
      >
        {{ t('todo.notifications.denied') }}
      </p>

      <template v-if="notificationsStore.isSubscribed && settings">
        <label class="flex flex-col gap-1">
          <span class="label-text">{{ t('todo.notifications.time') }}</span>
          <select
            class="select select-bordered w-full"
            :value="settings.digestTime"
            data-testid="todo-notifications-time"
            @change="changeDigestTime"
          >
            <option
              v-for="option in timeOptions"
              :key="option.value"
              :value="option.value"
            >
              {{ option.label }}
            </option>
          </select>
        </label>

        <div class="flex flex-col gap-2">
          <span class="label-text">{{ t('todo.notifications.weekdays') }}</span>
          <div class="flex flex-wrap gap-x-3 gap-y-2">
            <label
              v-for="{ key, jsIndex } in WEEKDAYS"
              :key="jsIndex"
              class="flex items-center gap-1 cursor-pointer"
            >
              <input
                type="checkbox"
                class="checkbox checkbox-sm"
                :checked="settings.weekdays.includes(jsIndex)"
                :data-testid="`todo-notifications-weekday-${jsIndex}`"
                @change="toggleWeekday(jsIndex)"
              >
              <span class="text-sm">{{ t(`todo.recurrence.weekdayNames.${key}`) }}</span>
            </label>
          </div>
        </div>

        <label class="flex flex-col gap-1">
          <span class="label-text">{{ t('todo.notifications.overdue') }}</span>
          <select
            class="select select-bordered w-full"
            :value="settings.overdueMode"
            data-testid="todo-notifications-overdue"
            @change="changeOverdueMode"
          >
            <option
              v-for="mode in TODO_DIGEST_OVERDUE_MODES"
              :key="mode"
              :value="mode"
            >
              {{ t(`todo.notifications.overdueModes.${mode}`) }}
            </option>
          </select>
          <span
            class="text-xs text-base-content/60"
            data-testid="todo-notifications-overdue-hint"
          >
            {{ t(`todo.notifications.overdueHints.${settings.overdueMode}`) }}
          </span>
        </label>

        <button
          type="button"
          class="btn btn-outline btn-sm self-start"
          :disabled="isSendingTest"
          data-testid="todo-notifications-test"
          @click="sendTest"
        >
          <span
            v-if="isSendingTest"
            class="loading loading-spinner loading-xs"
          />
          {{ t('todo.notifications.test') }}
        </button>
      </template>
    </div>

    <div
      v-if="canInstall"
      class="mt-6 rounded-box bg-base-200 p-4 flex flex-col gap-2"
      data-testid="todo-notifications-install"
    >
      <span class="font-medium">{{ t('todo.notifications.installTitle') }}</span>
      <span class="text-sm text-base-content/70">{{ t('todo.notifications.installHint') }}</span>
      <button
        type="button"
        class="btn btn-primary btn-sm self-start"
        data-testid="todo-notifications-install-button"
        @click="install"
      >
        <Icon
          name="heroicons:device-phone-mobile"
          size="16"
        />
        {{ t('header.installApp') }}
      </button>
    </div>
  </UiDialog>
</template>

<script setup lang="ts">
import { MINUTES_PER_DAY, TODO_DIGEST_OVERDUE_MODES, TODO_DIGEST_TIME_STEP_MINUTES } from '~~/shared/schemas/push'
import type { TodoDigestOverdueMode, TodoDigestSettings } from '~~/shared/types/push'
import { toSupportedLocale } from '~~/shared/utils/shared/locale'
import { appendErrorReason } from '~/utils/server-error'
import { WEEKDAYS } from '~/utils/weekdays'

const ERROR_REASON_TOAST_MS = 20000

const todoModalsStore = useTodoModalsStore()
const notificationsStore = useTodoNotificationsStore()
const { t, locale } = useI18n()
const { toast } = useToast()
const { formatError } = useServerError()
const { canInstall, install } = useInstallPrompt()

const isSendingTest = ref(false)

const isOpen = computed(() => todoModalsStore.isNotificationsModalOpen)
const settings = computed(() => notificationsStore.settings)

const formatTime = (minutes: number): string =>
  new Date(Date.UTC(2000, 0, 1, 0, minutes)).toLocaleTimeString(locale.value, { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })

const timeOptions = computed(() =>
  Array.from({ length: MINUTES_PER_DAY / TODO_DIGEST_TIME_STEP_MINUTES }, (_, index) => {
    const value = index * TODO_DIGEST_TIME_STEP_MINUTES
    return { value, label: formatTime(value) }
  }))

const isOverdueMode = (value: string): value is TodoDigestOverdueMode =>
  TODO_DIGEST_OVERDUE_MODES.some(mode => mode === value)

const close = (): void => {
  todoModalsStore.closeNotificationsModal()
}

const readCheckbox = (event: Event): HTMLInputElement | null =>
  event.target instanceof HTMLInputElement ? event.target : null

const readSelectValue = (event: Event): string =>
  event.target instanceof HTMLSelectElement ? event.target.value : ''

const toggleDevice = async (event: Event): Promise<void> => {
  const checkbox = readCheckbox(event)
  const shouldEnable = checkbox?.checked ?? !notificationsStore.isSubscribed

  try {
    await (shouldEnable ? notificationsStore.enable(toSupportedLocale(locale.value)) : notificationsStore.disable())
  }
  catch (error) {
    const fallback = shouldEnable ? t('todo.notifications.errors.enable') : t('todo.notifications.errors.disable')
    toast({ type: 'error', message: formatError(error, appendErrorReason(fallback, error)), timeout: ERROR_REASON_TOAST_MS })
  }
  finally {
    if (checkbox) {
      checkbox.checked = notificationsStore.isSubscribed
    }
  }
}

const saveSettings = async (changes: Partial<TodoDigestSettings>): Promise<void> => {
  if (!settings.value) {
    return
  }

  try {
    await notificationsStore.saveSettings({ ...settings.value, ...changes })
  }
  catch (error) {
    toast({ type: 'error', message: formatError(error, t('todo.notifications.errors.save')) })
  }
}

const changeDigestTime = (event: Event): void => {
  const digestTime = Number(readSelectValue(event))

  if (Number.isInteger(digestTime)) {
    saveSettings({ digestTime })
  }
}

const changeOverdueMode = (event: Event): void => {
  const overdueMode = readSelectValue(event)

  if (isOverdueMode(overdueMode)) {
    saveSettings({ overdueMode })
  }
}

const toggleWeekday = (weekday: number): void => {
  const weekdays = settings.value?.weekdays ?? []
  saveSettings({
    weekdays: weekdays.includes(weekday)
      ? weekdays.filter(day => day !== weekday)
      : [...weekdays, weekday].sort((first, second) => first - second),
  })
}

const sendTest = async (): Promise<void> => {
  isSendingTest.value = true

  try {
    await notificationsStore.sendTest()
    toast({ type: 'success', message: t('todo.notifications.testSent') })
  }
  catch (error) {
    toast({ type: 'error', message: formatError(error, t('todo.notifications.errors.test')) })
  }
  finally {
    isSendingTest.value = false
  }
}

watch(isOpen, (isNowOpen) => {
  if (isNowOpen) {
    notificationsStore.load()
  }
})
</script>
