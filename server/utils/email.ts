import { createError, getCookie, type H3Event } from 'h3'
import { z } from 'zod'
import { ERROR_KEYS } from '~~/shared/utils/shared/error-keys'
import { isTestMode } from '~~/server/utils/test-mode'
import { secureLog } from '~~/server/utils/secure-logger'
import { LOCALE_COOKIE_NAME } from '~~/shared/utils/shared/locale'

export type EmailTemplate = 'verification' | 'reset-password'
type EmailLanguage = 'en' | 'ru'

const getEmailLanguage = (event: H3Event): EmailLanguage =>
  getCookie(event, LOCALE_COOKIE_NAME) === 'ru' ? 'ru' : 'en'

type EmailParams = {
  readonly event: H3Event
  readonly to: string
  readonly code: string
  readonly template: EmailTemplate
  readonly language?: EmailLanguage
}

interface EmailContent {
  subject: string
  title: string
  message: string
  expiration: string
  ignore: string
}

const TEMPLATES: Record<EmailLanguage, Record<EmailTemplate, EmailContent>> = {
  en: {
    'verification': {
      subject: 'Your verification code',
      title: 'Welcome to dom.cash',
      message: 'Your verification code:',
      expiration: 'The code expires in 1 hour.',
      ignore: 'If you didn\'t request this, please ignore this email.',
    },
    'reset-password': {
      subject: 'Reset your password',
      title: 'Reset Password',
      message: 'You requested to reset your password. Here is your verification code:',
      expiration: 'The code expires in 1 hour.',
      ignore: 'If you didn\'t request this, please ignore this email.',
    },
  },
  ru: {
    'verification': {
      subject: 'Код подтверждения',
      title: 'Добро пожаловать в dom.cash',
      message: 'Ваш код подтверждения:',
      expiration: 'Код действителен 1 час.',
      ignore: 'Если вы не запрашивали этот код, проигнорируйте это письмо.',
    },
    'reset-password': {
      subject: 'Сброс пароля',
      title: 'Сброс пароля',
      message: 'Вы запросили сброс пароля. Ваш код подтверждения:',
      expiration: 'Код действителен 1 час.',
      ignore: 'Если вы не запрашивали сброс пароля, проигнорируйте это письмо.',
    },
  },
}

const buildHtml = (template: EmailTemplate, code: string, language: EmailLanguage): string => {
  const content = TEMPLATES[language][template]

  return `
    <div style="font-family: Arial, sans-serif; max-width:600px; margin:0 auto;">
      <h2>${content.title}</h2>
      <p>${content.message}</p>
      <div style="background:#f4f4f4; padding:20px; text-align:center; font-size:32px; font-weight:700; letter-spacing:6px; margin:20px 0;">
        ${code}
      </div>
      <p>${content.expiration}</p>
      <p>${content.ignore}</p>
    </div>
  `
}

const buildText = (template: EmailTemplate, code: string, language: EmailLanguage): string => {
  const content = TEMPLATES[language][template]
  return `${content.message} ${code}\n${content.expiration}`
}

const resendErrorSchema = z.object({ name: z.string() })

const readResendErrorName = async (response: Response): Promise<string | null> => {
  const body: unknown = await response.json().catch(() => null)
  const parsed = resendErrorSchema.safeParse(body)
  return parsed.success ? parsed.data.name : null
}

const createSendError = () => createError({ statusCode: 500, message: ERROR_KEYS.FAILED_TO_SEND_EMAIL })

export const sendVerificationEmail = async (params: EmailParams): Promise<void> => {
  const { event, to, code, template, language = getEmailLanguage(event) } = params
  if (isTestMode()) {
    const templateName = template === 'verification' ? 'Verification' : 'Password reset'
    console.log(`[DEV] ${templateName} code for ${to}: ${code}`)
    return
  }

  const resendApiKey = process.env.RESEND_API_KEY

  if (!resendApiKey) {
    throw createError({ statusCode: 500, message: ERROR_KEYS.EMAIL_NOT_CONFIGURED })
  }

  const content = TEMPLATES[language][template]

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'dom.cash <noreply@domcash.ixplo.ai>',
      to: [to],
      subject: content.subject,
      html: buildHtml(template, code, language),
      text: buildText(template, code, language),
      tags: [{ name: 'type', value: template }],
    }),
  }).catch((error: unknown) => {
    secureLog.error('Resend request failed:', error)
    throw createSendError()
  })

  if (!response.ok) {
    secureLog.error('Resend API error:', { status: response.status, name: await readResendErrorName(response) })
    throw createSendError()
  }
}
