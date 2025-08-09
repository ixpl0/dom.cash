import { defineEventHandler } from 'h3'
import { requireAuth } from '~~/server/utils/session'

export default defineEventHandler(async (event) => {
  return await requireAuth(event)
})
