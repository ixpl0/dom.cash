import { defineEventHandler, createError } from 'h3'
import { z } from 'zod'
import { Resend } from 'resend'
import { parseBody } from '~~/server/utils/validation'
import { emailVerificationCode, user } from '~~/server/db/schema'
import { eq } from 'drizzle-orm'
import { useDatabase } from '~~/server/db'

const sendCodeSchema = z.object({
  email: z
    .string()
    .min(3)
    .max(64)
    .trim()
    .regex(/^[a-zA-Z0-9]([a-zA-Z0-9+._-]*[a-zA-Z0-9])?@[a-zA-Z0-9]([a-zA-Z0-9.-]*[a-zA-Z0-9])?$/, 'Invalid email format'),
})

const generateCode = (): string => {
  const buf = new Uint32Array(1)
  crypto.getRandomValues(buf)
  const n = (buf[0] ?? 0) % 900000
  const code = 100000 + n

  return String(code)
}

const RATE_LIMITS = [
  { attempt: 1, delaySeconds: 90 },
  { attempt: 2, delaySeconds: 180 },
]

const MAX_ATTEMPTS = 2
const DEV_CODE = '111111'

export default defineEventHandler(async (event) => {
  const { email } = await parseBody(event, sendCodeSchema)
  const db = useDatabase(event)
  const now = new Date()

  const existingUser = await db.query.user.findFirst({
    where: eq(user.username, email),
  })

  if (existingUser) {
    throw createError({ statusCode: 400, message: 'User already exists' })
  }

  const existingCode = await db.query.emailVerificationCode.findFirst({
    where: eq(emailVerificationCode.email, email),
  })

  if (existingCode && existingCode.expiresAt > now) {
    if (existingCode.attemptCount >= MAX_ATTEMPTS) {
      throw createError({
        statusCode: 429,
        message: 'Maximum attempts exceeded',
      })
    }

    if (existingCode.lastSentAt) {
      const rateLimit = RATE_LIMITS.find(r => r.attempt === existingCode.attemptCount)
      const delayMs = (rateLimit?.delaySeconds || 300) * 1000
      const nextAllowedTime = new Date(existingCode.lastSentAt.getTime() + delayMs)

      if (now < nextAllowedTime) {
        const waitSeconds = Math.ceil((nextAllowedTime.getTime() - now.getTime()) / 1000)
        throw createError({
          statusCode: 429,
          message: `Please wait ${waitSeconds} seconds before requesting a new code`,
          data: { waitSeconds, attemptCount: existingCode.attemptCount },
        })
      }
    }
  }

  const isProduction = process.env.NODE_ENV === 'production'
  const isExistingCodeValid = existingCode && existingCode.expiresAt > now
  const code = isExistingCodeValid ? existingCode.code : (isProduction ? generateCode() : DEV_CODE)
  const expiresAt = isExistingCodeValid ? existingCode.expiresAt : new Date(now.getTime() + 10 * 60 * 1000)
  const attemptCount = isExistingCodeValid ? existingCode.attemptCount + 1 : 1

  await db
    .delete(emailVerificationCode)
    .where(eq(emailVerificationCode.email, email))

  const verificationId = isExistingCodeValid ? existingCode.id : crypto.randomUUID()

  await db
    .insert(emailVerificationCode)
    .values({
      id: verificationId,
      email,
      code,
      expiresAt,
      createdAt: isExistingCodeValid ? existingCode.createdAt : now,
      attemptCount,
      lastSentAt: now,
    })

  if (isProduction) {
    const resendApiKey = event.context.cloudflare?.env?.RESEND_API_KEY
    if (!resendApiKey) {
      throw createError({ statusCode: 500, message: 'Email service not configured' })
    }

    const resend = new Resend(resendApiKey)

    try {
      await resend.emails.send({
        from: 'dom.cash <no-reply@auth.dom.cash>',
        to: email,
        subject: 'Your verification code',
        html: `
          <div style="font-family: Arial, sans-serif; max-width:600px; margin:0 auto;">
            <h2>Welcome to dom.cash</h2>
            <p>Your verification code:</p>
            <div style="background:#f4f4f4; padding:20px; text-align:center; font-size:32px; font-weight:700; letter-spacing:6px; margin:20px 0;">
              ${code}
            </div>
            <p>The code expires in 10 minutes.</p>
            <p>If you didn't request it, just ignore this email.</p>
          </div>
        `,
        text: `Your verification code: ${code}\nIt expires in 10 minutes.`,
        tags: [{ name: 'type', value: 'verification' }],
      })
    }
    catch {
      throw createError({ statusCode: 500, message: 'Failed to send verification code' })
    }
  }

  return { success: true, attemptCount }
})
