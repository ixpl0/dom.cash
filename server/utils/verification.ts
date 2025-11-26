import { createError, type H3Event } from 'h3'
import { eq, lt } from 'drizzle-orm'
import { emailVerificationCode } from '~~/server/db/schema'
import { useDatabase } from '~~/server/db'

export const DEV_VERIFICATION_CODE = '111111'

export const generateVerificationCode = (): string => {
  const randomValue = crypto.getRandomValues(new Uint32Array(1))[0] ?? 0
  return String(100000 + (randomValue % 900000))
}

type RateLimit = {
  readonly attempt: number
  readonly delaySeconds: number
}

type VerificationConfig = {
  readonly rateLimits: ReadonlyArray<RateLimit>
  readonly maxAttempts: number
  readonly expirationMinutes: number
  readonly cooldownMinutes?: number
}

export const VERIFICATION_CONFIG = {
  registration: {
    rateLimits: [],
    maxAttempts: 5,
    expirationMinutes: 60,
    cooldownMinutes: 60,
  },
  passwordReset: {
    rateLimits: [],
    maxAttempts: 5,
    expirationMinutes: 60,
    cooldownMinutes: 60,
  },
} as const satisfies Record<string, VerificationConfig>

export const cleanupExpiredCodes = async (event: H3Event): Promise<void> => {
  const db = useDatabase(event)
  const now = new Date()

  await db
    .delete(emailVerificationCode)
    .where(lt(emailVerificationCode.expiresAt, now))
}

export const getExistingCode = async (event: H3Event, email: string) => {
  const db = useDatabase(event)

  return db.query.emailVerificationCode.findFirst({
    where: eq(emailVerificationCode.email, email),
  })
}

type RateLimitCheckResult = {
  readonly allowed: boolean
  readonly waitSeconds?: number
  readonly attemptCount?: number
}

export const checkRateLimit = (
  existingCode: { attemptCount: number, lastSentAt: Date | null, expiresAt: Date } | undefined,
  config: VerificationConfig,
  now: Date,
): RateLimitCheckResult => {
  if (!existingCode || existingCode.expiresAt <= now) {
    return { allowed: true }
  }

  if (existingCode.attemptCount >= config.maxAttempts) {
    return { allowed: false, attemptCount: existingCode.attemptCount }
  }

  if (existingCode.lastSentAt) {
    const rateLimit = config.rateLimits.find(r => r.attempt === existingCode.attemptCount)
    const delayMs = (rateLimit?.delaySeconds || 300) * 1000
    const nextAllowedTime = new Date(existingCode.lastSentAt.getTime() + delayMs)

    if (now < nextAllowedTime) {
      const waitSeconds = Math.ceil((nextAllowedTime.getTime() - now.getTime()) / 1000)
      return { allowed: false, waitSeconds, attemptCount: existingCode.attemptCount }
    }
  }

  return { allowed: true }
}

export const throwRateLimitError = (result: RateLimitCheckResult): never => {
  if (result.waitSeconds) {
    throw createError({
      statusCode: 429,
      message: `Please wait ${result.waitSeconds} seconds before requesting a new code`,
      data: { waitSeconds: result.waitSeconds, attemptCount: result.attemptCount },
    })
  }

  throw createError({
    statusCode: 429,
    message: 'Maximum attempts exceeded',
  })
}

type SaveCodeParams = {
  readonly event: H3Event
  readonly email: string
  readonly code: string
  readonly expiresAt: Date
  readonly attemptCount: number
  readonly existingCode?: { id: string, createdAt: Date } | null
}

export const saveVerificationCode = async (params: SaveCodeParams): Promise<void> => {
  const { event, email, code, expiresAt, attemptCount, existingCode } = params
  const db = useDatabase(event)
  const now = new Date()
  const verificationId = existingCode?.id ?? crypto.randomUUID()

  await db
    .insert(emailVerificationCode)
    .values({
      id: verificationId,
      email,
      code,
      expiresAt,
      createdAt: existingCode?.createdAt ?? now,
      attemptCount,
      lastSentAt: now,
    })
    .onConflictDoUpdate({
      target: emailVerificationCode.id,
      set: {
        code,
        expiresAt,
        attemptCount,
        lastSentAt: now,
      },
    })
}

type PrepareCodeResult = {
  readonly code: string
  readonly expiresAt: Date
  readonly attemptCount: number
}

type AlreadySentCheckResult = {
  readonly alreadySent: boolean
  readonly waitMinutes?: number
}

export const checkAlreadySent = (
  existingCode: { lastSentAt: Date | null } | undefined,
  now: Date,
  cooldownMinutes: number,
): AlreadySentCheckResult => {
  if (!existingCode || !existingCode.lastSentAt) {
    return { alreadySent: false }
  }

  const elapsedMinutes = (now.getTime() - existingCode.lastSentAt.getTime()) / 60000

  if (elapsedMinutes < cooldownMinutes) {
    const waitMinutes = Math.ceil(cooldownMinutes - elapsedMinutes)
    return { alreadySent: true, waitMinutes }
  }

  return { alreadySent: false }
}

export const prepareVerificationCode = (
  existingCode: { code: string, expiresAt: Date, attemptCount: number } | undefined,
  config: VerificationConfig,
  now: Date,
): PrepareCodeResult => {
  const isProduction = process.env.NODE_ENV === 'production'
  const isExistingCodeValid = existingCode && existingCode.expiresAt > now

  return {
    code: isExistingCodeValid
      ? existingCode.code
      : (isProduction ? generateVerificationCode() : DEV_VERIFICATION_CODE),
    expiresAt: isExistingCodeValid
      ? existingCode.expiresAt
      : new Date(now.getTime() + config.expirationMinutes * 60 * 1000),
    attemptCount: isExistingCodeValid ? existingCode.attemptCount + 1 : 1,
  }
}
