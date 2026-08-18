import { defineEventHandler } from 'h3'
import { clearImpersonationCookie } from '~~/server/utils/impersonation'

export default defineEventHandler((event) => {
  clearImpersonationCookie(event)

  return { success: true }
})
