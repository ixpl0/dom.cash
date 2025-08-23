import { generalRateLimit } from '~~/server/utils/rate-limiter'

export default defineEventHandler(async (event) => {
  if (event.node.req.url?.startsWith('/api/')) {
    try {
      generalRateLimit(event)
    }
    catch (error) {
      if (error && typeof error === 'object' && 'statusCode' in error && error.statusCode === 429) {
        throw error
      }
    }
  }
})
