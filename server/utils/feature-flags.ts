export const isEmailVerificationDisabled = (): boolean => {
  return Boolean(process.env.DISABLE_EMAIL_VERIFICATION)
}
