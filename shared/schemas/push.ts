import { z } from 'zod'
import { getBase64UrlLength } from '~~/shared/utils/shared/base64url'
import { SUPPORTED_LOCALES } from '~~/shared/utils/shared/locale'
import { isValidTimeZone } from '~~/shared/utils/shared/time-zones'

export const TODO_DIGEST_OVERDUE_MODES = ['fading', 'daily', 'off'] as const

export const TODO_DIGEST_TAG = 'todo-digest'

export const TODO_DIGEST_TIME_STEP_MINUTES = 15

export const MINUTES_PER_DAY = 24 * 60

export const ALL_WEEKDAYS: readonly number[] = [0, 1, 2, 3, 4, 5, 6]

export const PUSH_ENDPOINT_MAX_LENGTH = 2048

const TIME_ZONE_MAX_LENGTH = 64

const P256DH_KEY_BYTES = 65

const AUTH_SECRET_BYTES = 16

const PUSH_SERVICE_HOSTNAME = /^(?:fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|web\.push\.apple\.com|[a-z0-9-]+\.notify\.windows\.com)$/

const pushKeySchema = (byteLength: number) => z
  .string()
  .regex(/^[\w-]+={0,2}$/)
  .transform(value => value.replace(/=+$/, ''))
  .pipe(z.string().length(getBase64UrlLength(byteLength)))

export const pushEndpointSchema = z.url({ protocol: /^https$/, hostname: PUSH_SERVICE_HOSTNAME }).max(PUSH_ENDPOINT_MAX_LENGTH)

export const pushEndpointBodySchema = z.object({
  endpoint: pushEndpointSchema,
})

export const pushDeviceSchema = z.object({
  endpoint: pushEndpointSchema,
  keys: z.object({
    p256dh: pushKeySchema(P256DH_KEY_BYTES),
    auth: pushKeySchema(AUTH_SECRET_BYTES),
  }),
  timeZone: z.string().max(TIME_ZONE_MAX_LENGTH).refine(isValidTimeZone),
  locale: z.enum(SUPPORTED_LOCALES).optional(),
})

export const todoDigestSettingsSchema = z.object({
  digestTime: z.number().int().min(0).max(MINUTES_PER_DAY - 1).multipleOf(TODO_DIGEST_TIME_STEP_MINUTES),
  weekdays: z
    .array(z.number().int().min(0).max(ALL_WEEKDAYS.length - 1))
    .max(ALL_WEEKDAYS.length)
    .refine(weekdays => new Set(weekdays).size === weekdays.length),
  overdueMode: z.enum(TODO_DIGEST_OVERDUE_MODES),
})

export const DEFAULT_TODO_DIGEST_SETTINGS: z.infer<typeof todoDigestSettingsSchema> = {
  digestTime: 8 * 60,
  weekdays: [...ALL_WEEKDAYS],
  overdueMode: 'fading',
}
