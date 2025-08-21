import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('~~/server/db', () => ({
  db: {
    select: vi.fn(),
    from: vi.fn(),
    where: vi.fn(),
    limit: vi.fn(),
    insert: vi.fn(),
    values: vi.fn(),
    returning: vi.fn(),
    update: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
    leftJoin: vi.fn(),
  },
  useDatabase: vi.fn(),
}))

vi.mock('~~/server/db/schema', () => ({
  entry: {
    monthId: 'entry.monthId',
    id: 'entry.id',
  },
  month: {
    id: 'month.id',
    userId: 'month.userId',
  },
  budgetShare: {
    access: 'budgetShare.access',
    ownerId: 'budgetShare.ownerId',
    sharedWithId: 'budgetShare.sharedWithId',
  },
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
  and: vi.fn(),
}))

Object.defineProperty(globalThis, 'crypto', {
  value: {
    randomUUID: vi.fn().mockReturnValue('mock-uuid'),
  },
  writable: true,
})

let mockDb: any

// Mock event for tests
const mockEvent = {
  context: {
    cloudflare: {
      env: {
        DB: mockDb,
      },
    },
  },
} as any

const {
  getMonthOwner,
  getEntryWithMonth,
  checkWritePermissionForMonth,
  createEntry,
  updateEntry,
  deleteEntry,
} = await import('~~/server/services/entries')

describe('server/services/entries', () => {
  beforeEach(async () => {
    vi.clearAllMocks()

    const db = await import('~~/server/db')
    const mockUseDatabase = db.useDatabase as ReturnType<typeof vi.fn>
    mockDb = {
      select: vi.fn(),
      from: vi.fn(),
      where: vi.fn(),
      limit: vi.fn(),
      insert: vi.fn(),
      values: vi.fn(),
      returning: vi.fn(),
      update: vi.fn(),
      set: vi.fn(),
      delete: vi.fn(),
      leftJoin: vi.fn(),
    }
    mockUseDatabase.mockReturnValue(mockDb)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('getMonthOwner', () => {
    it('should return month owner if found', async () => {
      const monthData = { id: 'month-1', userId: 'user-1' }

      mockDb.select.mockReturnThis()
      mockDb.from.mockReturnThis()
      mockDb.where.mockReturnThis()
      mockDb.limit.mockResolvedValue([monthData])

      const result = await getMonthOwner('month-1', mockEvent)

      expect(result).toEqual(monthData)
    })

    it('should return null if month not found', async () => {
      mockDb.select.mockReturnThis()
      mockDb.from.mockReturnThis()
      mockDb.where.mockReturnThis()
      mockDb.limit.mockResolvedValue([])

      const result = await getMonthOwner('nonexistent', mockEvent)

      expect(result).toBeNull()
    })
  })

  describe('getEntryWithMonth', () => {
    it('should return entry with month if found', async () => {
      const entryData = {
        entry: { id: 'entry-1', monthId: 'month-1' },
        month: { id: 'month-1', userId: 'user-1' },
      }

      mockDb.select.mockReturnThis()
      mockDb.from.mockReturnThis()
      mockDb.leftJoin.mockReturnThis()
      mockDb.where.mockReturnThis()
      mockDb.limit.mockResolvedValue([entryData])

      const result = await getEntryWithMonth('entry-1', mockEvent)

      expect(result).toEqual(entryData)
    })

    it('should return null if entry not found', async () => {
      mockDb.select.mockReturnThis()
      mockDb.from.mockReturnThis()
      mockDb.leftJoin.mockReturnThis()
      mockDb.where.mockReturnThis()
      mockDb.limit.mockResolvedValue([])

      const result = await getEntryWithMonth('nonexistent', mockEvent)

      expect(result).toBeNull()
    })

    it('should return null if entry has no month', async () => {
      const entryData = {
        entry: { id: 'entry-1', monthId: 'month-1' },
        month: null,
      }

      mockDb.select.mockReturnThis()
      mockDb.from.mockReturnThis()
      mockDb.leftJoin.mockReturnThis()
      mockDb.where.mockReturnThis()
      mockDb.limit.mockResolvedValue([entryData])

      const result = await getEntryWithMonth('entry-1', mockEvent)

      expect(result).toBeNull()
    })
  })

  describe('checkWritePermissionForMonth', () => {
    it('should return true for same user', async () => {
      const result = await checkWritePermissionForMonth('user-1', 'user-1', mockEvent)

      expect(result).toBe(true)
    })

    it('should return true if user has write access', async () => {
      mockDb.select.mockReturnThis()
      mockDb.from.mockReturnThis()
      mockDb.where.mockReturnThis()
      mockDb.limit.mockResolvedValue([{ access: 'write' }])

      const result = await checkWritePermissionForMonth('user-1', 'user-2', mockEvent)

      expect(result).toBe(true)
    })

    it('should return false if user has no access', async () => {
      mockDb.select.mockReturnThis()
      mockDb.from.mockReturnThis()
      mockDb.where.mockReturnThis()
      mockDb.limit.mockResolvedValue([])

      const result = await checkWritePermissionForMonth('user-1', 'user-2', mockEvent)

      expect(result).toBe(false)
    })

    it('should return false if user has only read access', async () => {
      mockDb.select.mockReturnThis()
      mockDb.from.mockReturnThis()
      mockDb.where.mockReturnThis()
      mockDb.limit.mockResolvedValue([{ access: 'read' }])

      const result = await checkWritePermissionForMonth('user-1', 'user-2', mockEvent)

      expect(result).toBe(false)
    })
  })

  describe('createEntry', () => {
    it('should create new entry successfully', async () => {
      const newEntry = {
        id: 'entry-1',
        monthId: 'month-1',
        kind: 'income',
        description: 'Salary',
        amount: 5000,
        currency: 'USD',
        date: '2024-01-15',
      }

      mockDb.insert.mockReturnThis()
      mockDb.values.mockReturnThis()
      mockDb.returning.mockResolvedValue([newEntry])

      const result = await createEntry({
        monthId: 'month-1',
        kind: 'income',
        description: 'Salary',
        amount: 5000,
        currency: 'USD',
        date: '2024-01-15',
      }, mockEvent)

      expect(result).toEqual(newEntry)
      expect(globalThis.crypto.randomUUID).toHaveBeenCalled()
    })

    it('should create entry with null date when date not provided', async () => {
      const newEntry = {
        id: 'entry-1',
        monthId: 'month-1',
        kind: 'balance',
        description: 'Opening balance',
        amount: 1000,
        currency: 'USD',
        date: null,
      }

      mockDb.insert.mockReturnThis()
      mockDb.values.mockReturnThis()
      mockDb.returning.mockResolvedValue([newEntry])

      const result = await createEntry({
        monthId: 'month-1',
        kind: 'balance',
        description: 'Opening balance',
        amount: 1000,
        currency: 'USD',
      }, mockEvent)

      expect(result).toEqual(newEntry)
    })
  })

  describe('updateEntry', () => {
    it('should update entry successfully', async () => {
      const updatedEntry = {
        id: 'entry-1',
        description: 'Updated description',
        amount: 2000,
        currency: 'EUR',
        date: '2024-01-20',
      }

      mockDb.update.mockReturnThis()
      mockDb.set.mockReturnThis()
      mockDb.where.mockReturnThis()
      mockDb.returning.mockResolvedValue([updatedEntry])

      const result = await updateEntry('entry-1', {
        description: 'Updated description',
        amount: 2000,
        currency: 'EUR',
        date: '2024-01-20',
      }, mockEvent)

      expect(result).toEqual(updatedEntry)
    })

    it('should set date to null when not provided', async () => {
      const updatedEntry = {
        id: 'entry-1',
        description: 'Updated description',
        amount: 2000,
        currency: 'EUR',
        date: null,
      }

      mockDb.update.mockReturnThis()
      mockDb.set.mockReturnThis()
      mockDb.where.mockReturnThis()
      mockDb.returning.mockResolvedValue([updatedEntry])

      const result = await updateEntry('entry-1', {
        description: 'Updated description',
        amount: 2000,
        currency: 'EUR',
      }, mockEvent)

      expect(result).toEqual(updatedEntry)
    })
  })

  describe('deleteEntry', () => {
    it('should delete entry successfully', async () => {
      const deletedEntry = {
        id: 'entry-1',
        description: 'Deleted entry',
        amount: 1000,
        currency: 'USD',
      }

      mockDb.delete.mockReturnThis()
      mockDb.where.mockReturnThis()
      mockDb.returning.mockResolvedValue([deletedEntry])

      const result = await deleteEntry('entry-1', mockEvent)

      expect(result).toEqual(deletedEntry)
    })
  })
})
