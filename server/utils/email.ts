import { createError, type H3Event } from 'h3'
import { ERROR_KEYS } from '~~/server/utils/error-keys'

type EmailTemplate = 'verification' | 'reset-password'
type EmailLanguage = 'en' | 'ru'

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

export const sendVerificationEmail = async (params: EmailParams): Promise<void> => {
  const { event, to, code, template, language = 'en' } = params
  const isProduction = process.env.NODE_ENV === 'production'

  if (!isProduction) {
    const templateName = template === 'verification' ? 'Verification' : 'Password reset'
    console.log(`[DEV] ${templateName} code for ${to}: ${code}`)
    return
  }

  const resendApiKey = event.context.cloudflare?.env?.RESEND_API_KEY

  if (!resendApiKey) {
    throw createError({ statusCode: 500, message: ERROR_KEYS.EMAIL_NOT_CONFIGURED })
  }

  const content = TEMPLATES[language][template]

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'dom.cash <noreply@auth.dom.cash>',
        to: [to],
        subject: content.subject,
        html: buildHtml(template, code, language),
        text: buildText(template, code, language),
        tags: [{ name: 'type', value: template }],
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('Resend API error:', errorData)
      throw new Error('Resend API request failed')
    }
  }
  catch {
    throw createError({ statusCode: 500, message: ERROR_KEYS.FAILED_TO_SEND_EMAIL })
  }
}
