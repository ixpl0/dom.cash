import { readdirSync, readFileSync } from 'node:fs'
import { DatabaseSync, type SQLInputValue, type SQLOutputValue } from 'node:sqlite'
import type { H3Event } from 'h3'
import { D1_MAX_VARIABLES_PER_STATEMENT } from '../../../server/utils/d1-limits'
import { createTestBucket, type TestBucket } from './test-bucket'

declare module 'node:sqlite' {
  interface StatementSync {
    setReturnArrays(enabled: boolean): void
  }
}

type Row = Record<string, SQLOutputValue>

interface StatementResult {
  results: Row[]
  success: true
  meta: Record<string, never>
}

interface TestStatement {
  bind: (...values: unknown[]) => TestStatement
  all: () => Promise<StatementResult>
  raw: () => Promise<SQLOutputValue[][]>
  run: () => Promise<StatementResult>
  execute: () => StatementResult
}

export interface TestDatabase {
  event: H3Event
  sqlite: DatabaseSync
  docsBucket: TestBucket
  getQueries: () => string[]
  getRequestCount: () => number
}

const MIGRATIONS_DIRECTORY = new URL('../../../migrations/', import.meta.url)

const toSqlValue = (value: unknown): SQLInputValue => {
  if (typeof value === 'boolean') {
    return value ? 1 : 0
  }
  if (value === null || typeof value === 'number' || typeof value === 'bigint' || typeof value === 'string' || value instanceof Uint8Array) {
    return value
  }
  throw new TypeError(`D1 cannot bind ${typeof value}`)
}

const applyMigrations = (sqlite: DatabaseSync): void => {
  readdirSync(MIGRATIONS_DIRECTORY)
    .filter(fileName => fileName.endsWith('.sql'))
    .sort()
    .forEach((fileName) => {
      sqlite.exec(readFileSync(new URL(fileName, MIGRATIONS_DIRECTORY), 'utf8'))
    })
}

export const createTestDatabase = (): TestDatabase => {
  const sqlite = new DatabaseSync(':memory:')
  applyMigrations(sqlite)
  sqlite.exec('DELETE FROM currency')
  sqlite.exec('PRAGMA foreign_keys = ON')

  let queries: string[] = []
  let requestCount = 0

  const countRequest = <T>(result: T): T => {
    requestCount += 1
    return result
  }

  const createStatement = (query: string, values: SQLInputValue[]): TestStatement => {
    const execute = (): StatementResult => {
      queries = [...queries, query]
      return { results: sqlite.prepare(query).all(...values), success: true, meta: {} }
    }

    return {
      bind: (...nextValues) => {
        if (nextValues.length > D1_MAX_VARIABLES_PER_STATEMENT) {
          throw new Error(`D1 binds at most ${D1_MAX_VARIABLES_PER_STATEMENT} parameters, got ${nextValues.length}`)
        }
        return createStatement(query, nextValues.map(toSqlValue))
      },
      all: async () => countRequest(execute()),
      run: async () => countRequest(execute()),
      raw: async () => {
        queries = [...queries, query]
        const statement = sqlite.prepare(query)
        statement.setReturnArrays(true)
        return countRequest(statement.all(...values).map(row => Object.values(row)))
      },
      execute,
    }
  }

  const batch = async (statements: TestStatement[]): Promise<StatementResult[]> => {
    requestCount += 1
    sqlite.exec('BEGIN')
    try {
      const results = statements.map(statement => statement.execute())
      sqlite.exec('COMMIT')
      return results
    }
    catch (error) {
      sqlite.exec('ROLLBACK')
      throw error
    }
  }

  const database = {
    prepare: (query: string) => createStatement(query, []),
    batch,
  }

  const docsBucket = createTestBucket()
  const event = { context: { cloudflare: { env: { DB: database, DOCS_BUCKET: docsBucket.bucket } } } } as unknown as H3Event

  return {
    event,
    sqlite,
    docsBucket,
    getQueries: () => queries,
    getRequestCount: () => requestCount,
  }
}
