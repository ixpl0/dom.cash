import { createError, type H3Event } from 'h3'
import { eq, lt } from 'drizzle-orm'
import { emailVerificationCode } from '~~/server/db/schema'
import { useDatabase } from '~~/server/db'
import { ERROR_KEYS } from '~~/server/utils/error-keys'
import { timingSafeCompareStrings } from '~~/server/utils/crypto'

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
  readonly maxVerifyAttempts: number
}

export const VERIFICATION_CONFIG = {
  registration: {
    rateLimits: [],
    maxAttempts: 5,
    expirationMinutes: 60,
    cooldownMinutes: 60,
    maxVerifyAttempts: 3,
  },
  passwordReset: {
    rateLimits: [],
    maxAttempts: 5,
    expirationMinutes: 60,
    cooldownMinutes: 60,
    maxVerifyAttempts: 3,
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
      message: ERROR_KEYS.RATE_LIMIT_WAIT,
      data: { params: { seconds: result.waitSeconds }, attemptCount: result.attemptCount },
    })
  }

  throw createError({
    statusCode: 429,
    message: ERROR_KEYS.RATE_LIMIT_EXCEEDED,
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

type VerifyCodeErrorReason = 'not_found' | 'expired' | 'invalid_code' | 'max_attempts_exceeded'

type VerifyCodeSuccess = { readonly valid: true, readonly record: { id: string, email: string } }
type VerifyCodeFailure = { readonly valid: false, readonly reason: VerifyCodeErrorReason }
type VerifyCodeResult = VerifyCodeSuccess | VerifyCodeFailure

type VerifyCodeParams = {
  readonly event: H3Event
  readonly email: string
  readonly code: string
  readonly config: VerificationConfig
}

export const verifyCode = async (params: VerifyCodeParams): Promise<VerifyCodeResult> => {
  const { event, email, code, config } = params
  const db = useDatabase(event)
  const now = new Date()

  const record = await db.query.emailVerificationCode.findFirst({
    where: eq(emailVerificationCode.email, email),
  })

  if (!record) {
    return { valid: false, reason: 'not_found' }
  }

  if (record.expiresAt <= now) {
    return { valid: false, reason: 'expired' }
  }

  if (record.verifyAttemptCount >= config.maxVerifyAttempts) {
    return { valid: false, reason: 'max_attempts_exceeded' }
  }

  if (!timingSafeCompareStrings(record.code, code)) {
    await db
      .update(emailVerificationCode)
      .set({ verifyAttemptCount: record.verifyAttemptCount + 1 })
      .where(eq(emailVerificationCode.id, record.id))

    if (record.verifyAttemptCount + 1 >= config.maxVerifyAttempts) {
      return { valid: false, reason: 'max_attempts_exceeded' }
    }

    return { valid: false, reason: 'invalid_code' }
  }

  return { valid: true, record: { id: record.id, email: record.email } }
}

export const throwVerifyCodeError = (reason: VerifyCodeErrorReason): never => {
  if (reason === 'max_attempts_exceeded') {
    throw createError({
      statusCode: 429,
      message: ERROR_KEYS.RATE_LIMIT_TOO_MANY_FAILED,
    })
  }

  throw createError({
    statusCode: 400,
    message: ERROR_KEYS.INVALID_VERIFICATION_CODE,
  })
}

export const deleteVerificationCode = async (event: H3Event, email: string): Promise<void> => {
  const db = useDatabase(event)

  await db
    .delete(emailVerificationCode)
    .where(eq(emailVerificationCode.email, email))
}
