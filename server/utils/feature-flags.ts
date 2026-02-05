const TRUE_VALUES = new Set(['1', 'true', 'yes', 'on'])

export const isEmailVerificationDisabled = (): boolean => {
  const rawValue = process.env.DISABLE_EMAIL_VERIFICATION

  if (!rawValue) {
    return false
  }

  return TRUE_VALUES.has(rawValue.trim().toLowerCase())
}
