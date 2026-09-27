import { createError, type H3Event } from 'h3'
import { and, eq, lt, sql } from 'drizzle-orm'
import { emailVerificationCode } from '~~/server/db/schema'
import { useDatabase } from '~~/server/db'
import { ERROR_KEYS } from '~~/shared/utils/shared/error-keys'
import { timingSafeCompareStrings } from '~~/server/utils/crypto'
import { isTestMode } from '~~/server/utils/test-mode'
import { sendVerificationEmail, type EmailTemplate } from '~~/server/utils/email'
import type { CodeRequestResult } from '~~/shared/types'

const DEV_VERIFICATION_CODE = '111111'

const generateVerificationCode = (): string => {
  const randomValue = crypto.getRandomValues(new Uint32Array(1))[0] ?? 0
  return String(100000 + (randomValue % 900000))
}

type VerificationConfig = {
  readonly expirationMinutes: number
  readonly cooldownMinutes?: number
  readonly maxVerifyAttempts: number
}

export const VERIFICATION_CONFIG = {
  registration: {
    expirationMinutes: 60,
    cooldownMinutes: 60,
    maxVerifyAttempts: 3,
  },
  passwordReset: {
    expirationMinutes: 60,
    cooldownMinutes: 60,
    maxVerifyAttempts: 3,
  },
} as const satisfies Record<string, VerificationConfig>

const cleanupExpiredCodes = async (event: H3Event): Promise<void> => {
  const db = useDatabase(event)
  const now = new Date()

  await db
    .delete(emailVerificationCode)
    .where(lt(emailVerificationCode.expiresAt, now))
}

const getExistingCode = async (event: H3Event, email: string) => {
  const db = useDatabase(event)

  return db.query.emailVerificationCode.findFirst({
    where: eq(emailVerificationCode.email, email),
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

const saveVerificationCode = async (params: SaveCodeParams): Promise<void> => {
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

const checkAlreadySent = (
  existingCode: { lastSentAt: Date | null } | undefined,
  now: Date,
  cooldownMinutes: number,
): CodeRequestResult => {
  if (!existingCode || !existingCode.lastSentAt) {
    return { alreadySent: false }
  }

  const elapsedMinutes = (now.getTime() - existingCode.lastSentAt.getTime()) / 60000

  if (elapsedMinutes < cooldownMinutes) {
    return { alreadySent: true, waitMinutes: Math.ceil(cooldownMinutes - elapsedMinutes) }
  }

  return { alreadySent: false }
}

const prepareVerificationCode = (
  existingCode: { code: string, expiresAt: Date, attemptCount: number } | undefined,
  config: VerificationConfig,
  now: Date,
): PrepareCodeResult => {
  const isExistingCodeValid = existingCode && existingCode.expiresAt > now

  return {
    code: isExistingCodeValid
      ? existingCode.code
      : (isTestMode() ? DEV_VERIFICATION_CODE : generateVerificationCode()),
    expiresAt: isExistingCodeValid
      ? existingCode.expiresAt
      : new Date(now.getTime() + config.expirationMinutes * 60 * 1000),
    attemptCount: isExistingCodeValid ? existingCode.attemptCount + 1 : 1,
  }
}

type CodePurpose = keyof typeof VERIFICATION_CONFIG

const EMAIL_TEMPLATES = {
  registration: 'verification',
  passwordReset: 'reset-password',
} as const satisfies Record<CodePurpose, EmailTemplate>

export const requestVerificationCode = async (event: H3Event, email: string, purpose: CodePurpose): Promise<CodeRequestResult> => {
  const now = new Date()
  const config = VERIFICATION_CONFIG[purpose]

  await cleanupExpiredCodes(event)

  const existingCode = await getExistingCode(event, email)
  const alreadySent = checkAlreadySent(existingCode, now, config.cooldownMinutes)

  if (alreadySent.alreadySent) {
    return alreadySent
  }

  const { code, expiresAt, attemptCount } = prepareVerificationCode(existingCode, config, now)

  await saveVerificationCode({ event, email, code, expiresAt, attemptCount, existingCode })
  await sendVerificationEmail({ event, to: email, code, template: EMAIL_TEMPLATES[purpose] })

  return { alreadySent: false }
}

type VerifyCodeErrorReason = 'not_found' | 'expired' | 'invalid_code' | 'max_attempts_exceeded'

type VerifyCodeSuccess = { readonly valid: true }
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

  const [attempt] = await db
    .update(emailVerificationCode)
    .set({ verifyAttemptCount: sql`${emailVerificationCode.verifyAttemptCount} + 1` })
    .where(and(
      eq(emailVerificationCode.id, record.id),
      lt(emailVerificationCode.verifyAttemptCount, config.maxVerifyAttempts),
    ))
    .returning({ code: emailVerificationCode.code, verifyAttemptCount: emailVerificationCode.verifyAttemptCount })

  if (!attempt) {
    return { valid: false, reason: 'max_attempts_exceeded' }
  }

  if (!timingSafeCompareStrings(attempt.code, code)) {
    return attempt.verifyAttemptCount >= config.maxVerifyAttempts
      ? { valid: false, reason: 'max_attempts_exceeded' }
      : { valid: false, reason: 'invalid_code' }
  }

  const [consumed] = await db
    .delete(emailVerificationCode)
    .where(eq(emailVerificationCode.id, record.id))
    .returning({ id: emailVerificationCode.id })

  if (!consumed) {
    return { valid: false, reason: 'not_found' }
  }

  return { valid: true }
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
