import { defineEventHandler } from 'h3'
import { isEmailVerificationDisabled } from '~~/server/utils/feature-flags'

export default defineEventHandler(() => {
  return {
    emailVerificationDisabled: isEmailVerificationDisabled(),
  }
})
