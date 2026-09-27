import type { z } from 'zod'
import { emailSchema, passwordSchema, verificationCodeSchema } from '~~/shared/schemas/auth'

export type AuthField = 'username' | 'password' | 'code'
export type AuthFieldValues = Partial<Record<AuthField, string>>
export type AuthFieldErrors = Partial<Record<AuthField, string>>

interface FieldRule {
  schema: z.ZodType
  tooShortKey: string
  tooLongKey: string
  invalidKey: string
}

const FIELD_RULES: Record<AuthField, FieldRule> = {
  username: {
    schema: emailSchema,
    tooShortKey: 'auth.usernameMinLength',
    tooLongKey: 'auth.usernameMaxLength',
    invalidKey: 'auth.usernameInvalid',
  },
  password: {
    schema: passwordSchema,
    tooShortKey: 'auth.passwordMinLength',
    tooLongKey: 'auth.passwordMaxLength',
    invalidKey: 'auth.passwordMinLength',
  },
  code: {
    schema: verificationCodeSchema,
    tooShortKey: 'auth.verificationCodeInvalid',
    tooLongKey: 'auth.verificationCodeInvalid',
    invalidKey: 'auth.verificationCodeInvalid',
  },
}

const AUTH_FIELDS = Object.keys(FIELD_RULES) as AuthField[]

const getFieldErrorKey = (field: AuthField, value: string): string | null => {
  const { schema, tooShortKey, tooLongKey, invalidKey } = FIELD_RULES[field]
  const result = schema.safeParse(value)

  if (result.success) {
    return null
  }

  switch (result.error.issues[0]?.code) {
    case 'too_small':
      return tooShortKey
    case 'too_big':
      return tooLongKey
    default:
      return invalidKey
  }
}

export const getAuthFieldErrors = (values: AuthFieldValues): AuthFieldErrors =>
  AUTH_FIELDS.reduce<AuthFieldErrors>((fieldErrors, field) => {
    const value = values[field]
    const errorKey = value === undefined ? null : getFieldErrorKey(field, value)
    return errorKey ? { ...fieldErrors, [field]: errorKey } : fieldErrors
  }, {})
