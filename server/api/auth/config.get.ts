import { defineEventHandler } from 'h3'
import { isEmailVerificationDisabled } from '~~/server/utils/feature-flags'
import { getRegistrationState } from '~~/server/services/auth/registration'

export default defineEventHandler(async (event) => {
  const { isOpen } = await getRegistrationState(event, new Date())

  return {
    emailVerificationDisabled: isEmailVerificationDisabled(),
    registrationOpen: isOpen,
  }
})
