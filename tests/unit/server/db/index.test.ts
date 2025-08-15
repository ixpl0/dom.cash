import { describe, it, expect, vi } from 'vitest'

const mockCreateClient = vi.fn()
const mockDrizzle = vi.fn()

vi.mock('@libsql/client', () => ({
  createClient: mockCreateClient,
}))

vi.mock('drizzle-orm/libsql', () => ({
  drizzle: mockDrizzle,
}))

vi.mock('~~/server/db/schema', () => ({
  user: {},
  session: {},
  month: {},
  entry: {},
  currency: {},
  budgetShare: {},
}))

describe('server/db/index', () => {
  it('should create client with correct file path', async () => {
    const mockClient = {}
    const mockDb = {}

    mockCreateClient.mockReturnValue(mockClient)
    mockDrizzle.mockReturnValue(mockDb)

    await import('~~/server/db/index')

    expect(mockCreateClient).toHaveBeenCalledWith({ url: 'file:./db.sqlite' })
  })

  it('should create drizzle instance with client and schema', async () => {
    const mockClient = {}
    const mockDb = {}
    const mockSchema = await import('~~/server/db/schema')

    mockCreateClient.mockReturnValue(mockClient)
    mockDrizzle.mockReturnValue(mockDb)

    await import('~~/server/db/index')

    expect(mockDrizzle).toHaveBeenCalledWith(mockClient, { schema: mockSchema })
  })

  it('should export db instance', async () => {
    const mockClient = {}
    const mockDb = { select: vi.fn() }

    mockCreateClient.mockReturnValue(mockClient)
    mockDrizzle.mockReturnValue(mockDb)

    const dbModule = await import('~~/server/db/index')

    expect(dbModule.db).toBeDefined()
  })
})
