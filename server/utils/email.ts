import { createError, type H3Event } from 'h3'

type EmailTemplate = 'verification' | 'reset-password'

type EmailParams = {
  readonly event: H3Event
  readonly to: string
  readonly code: string
  readonly template: EmailTemplate
}

const TEMPLATES: Record<EmailTemplate, { subject: string, title: string, message: string, expiration: string }> = {
  'verification': {
    subject: 'Your verification code',
    title: 'Welcome to dom.cash',
    message: 'Your verification code:',
    expiration: '10 minutes',
  },
  'reset-password': {
    subject: 'Reset your password',
    title: 'Reset Password',
    message: 'You requested to reset your password. Here is your verification code:',
    expiration: '1 hour',
  },
}

const buildHtml = (template: EmailTemplate, code: string): string => {
  const { title, message, expiration } = TEMPLATES[template]

  return `
    <div style="font-family: Arial, sans-serif; max-width:600px; margin:0 auto;">
      <h2>${title}</h2>
      <p>${message}</p>
      <div style="background:#f4f4f4; padding:20px; text-align:center; font-size:32px; font-weight:700; letter-spacing:6px; margin:20px 0;">
        ${code}
      </div>
      <p>The code expires in ${expiration}.</p>
      <p>If you didn't request this, please ignore this email.</p>
    </div>
  `
}

const buildText = (template: EmailTemplate, code: string): string => {
  const { expiration } = TEMPLATES[template]
  return `Your verification code: ${code}\nIt expires in ${expiration}.`
}

export const sendVerificationEmail = async (params: EmailParams): Promise<void> => {
  const { event, to, code, template } = params
  const isProduction = process.env.NODE_ENV === 'production'

  if (!isProduction) {
    const templateName = template === 'verification' ? 'Verification' : 'Password reset'
    console.log(`[DEV] ${templateName} code for ${to}: ${code}`)
    return
  }

  const resendApiKey = event.context.cloudflare?.env?.RESEND_API_KEY

  if (!resendApiKey) {
    throw createError({ statusCode: 500, message: 'Email service not configured' })
  }

  const { subject } = TEMPLATES[template]

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
        subject,
        html: buildHtml(template, code),
        text: buildText(template, code),
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
    throw createError({ statusCode: 500, message: 'Failed to send verification code' })
  }
}
