import { eq } from 'drizzle-orm'
import { createError, type H3Event } from 'h3'
import { useDatabase } from '~~/server/db'
import { appSettings } from '~~/server/db/schema'
import { TEMPORARY_REGISTRATION_MINUTES, type RegistrationMode } from '~~/shared/schemas/auth'
import type { RegistrationState } from '~~/shared/types'
import { ERROR_KEYS } from '~~/shared/utils/shared/error-keys'

const SETTINGS_ROW_ID = 1
const MILLISECONDS_IN_SECOND = 1000
const TEMPORARY_REGISTRATION_MILLISECONDS = TEMPORARY_REGISTRATION_MINUTES * 60 * MILLISECONDS_IN_SECOND

type RegistrationSettings = {
  registrationOpen: boolean
  registrationOpenUntil: Date | null
}

const DEFAULT_SETTINGS: RegistrationSettings = {
  registrationOpen: true,
  registrationOpenUntil: null,
}

const readSettings = async (event: H3Event): Promise<RegistrationSettings> => {
  const [settings] = await useDatabase(event)
    .select({
      registrationOpen: appSettings.registrationOpen,
      registrationOpenUntil: appSettings.registrationOpenUntil,
    })
    .from(appSettings)
    .where(eq(appSettings.id, SETTINGS_ROW_ID))
    .limit(1)

  return settings ?? DEFAULT_SETTINGS
}

const toRegistrationState = (settings: RegistrationSettings, now: Date): RegistrationState => {
  if (settings.registrationOpen) {
    return { isOpen: true, closesInSeconds: null }
  }

  const millisecondsLeft = (settings.registrationOpenUntil?.getTime() ?? 0) - now.getTime()

  if (millisecondsLeft <= 0) {
    return { isOpen: false, closesInSeconds: null }
  }

  return { isOpen: true, closesInSeconds: Math.ceil(millisecondsLeft / MILLISECONDS_IN_SECOND) }
}

const toSettings = (mode: RegistrationMode, now: Date): RegistrationSettings => {
  if (mode === 'temporary') {
    return {
      registrationOpen: false,
      registrationOpenUntil: new Date(now.getTime() + TEMPORARY_REGISTRATION_MILLISECONDS),
    }
  }

  return { registrationOpen: mode === 'open', registrationOpenUntil: null }
}

export const getRegistrationState = async (event: H3Event, now: Date): Promise<RegistrationState> =>
  toRegistrationState(await readSettings(event), now)

export const assertRegistrationOpen = async (event: H3Event): Promise<void> => {
  const { isOpen } = await getRegistrationState(event, new Date())

  if (!isOpen) {
    throw createError({ statusCode: 403, message: ERROR_KEYS.REGISTRATION_CLOSED })
  }
}

export const updateRegistration = async (
  event: H3Event,
  mode: RegistrationMode,
  now: Date,
): Promise<RegistrationState> => {
  const settings = toSettings(mode, now)

  await useDatabase(event)
    .insert(appSettings)
    .values({ id: SETTINGS_ROW_ID, ...settings })
    .onConflictDoUpdate({ target: appSettings.id, set: settings })

  return toRegistrationState(settings, now)
}
