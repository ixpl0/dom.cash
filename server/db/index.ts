import { drizzle } from 'drizzle-orm/d1'
import type { H3Event } from 'h3'
import * as schema from '~~/server/db/schema'
import '~~/server/types/cloudflare'

export const useDatabase = (event: H3Event) => {
  const cloudflareDb = event.context.cloudflare?.env?.DB

  if (!cloudflareDb) {
    throw new Error('D1 database not found. Make sure to run with wrangler dev.')
  }

  return drizzle(cloudflareDb, { schema })
}
