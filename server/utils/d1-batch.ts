import type { H3Event } from 'h3'

interface BatchOperation {
  sql: string
  params?: unknown[]
}

export const executeBatch = async (event: H3Event, operations: BatchOperation[]): Promise<D1Result[]> => {
  const cloudflareDb = event.context.cloudflare?.env?.DB
  if (!cloudflareDb) {
    throw new Error('D1 database not found')
  }

  const statements: D1PreparedStatement[] = operations.map((op) => {
    const stmt = cloudflareDb.prepare(op.sql)
    return op.params ? stmt.bind(...op.params) : stmt
  })

  return await cloudflareDb.batch(statements)
}
