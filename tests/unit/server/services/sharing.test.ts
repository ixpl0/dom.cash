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
  },
}))

vi.mock('~~/server/db/schema', () => ({
  user: {
    username: 'user.username',
  },
  budgetShare: {
    id: 'budgetShare.id',
    ownerId: 'budgetShare.ownerId',
    sharedWithId: 'budgetShare.sharedWithId',
    access: 'budgetShare.access',
    createdAt: 'budgetShare.createdAt',
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

const {
  findUserByUsername,
  getExistingShare,
  getUserShares,
  getSharedWithUser,
  getShareById,
  createShare,
  updateShare,
  deleteShare,
  checkShareOwnership,
} = await import('~~/server/services/sharing')

describe('server/services/sharing', () => {
  beforeEach(async () => {
    vi.clearAllMocks()

    const db = await import('~~/server/db')
    mockDb = db.db
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('findUserByUsername', () => {
    it('should return user if found', async () => {
      const user = { id: 'user-1', username: 'testuser' }

      mockDb.select.mockReturnThis()
      mockDb.from.mockReturnThis()
      mockDb.where.mockReturnThis()
      mockDb.limit.mockResolvedValue([user])

      const result = await findUserByUsername('testuser')

      expect(result).toEqual(user)
    })

    it('should return null if user not found', async () => {
      mockDb.select.mockReturnThis()
      mockDb.from.mockReturnThis()
      mockDb.where.mockReturnThis()
      mockDb.limit.mockResolvedValue([])

      const result = await findUserByUsername('nonexistent')

      expect(result).toBeNull()
    })
  })

  describe('getExistingShare', () => {
    it('should return share if exists', async () => {
      const share = { id: 'share-1', ownerId: 'user-1', sharedWithId: 'user-2', access: 'write' }

      mockDb.select.mockReturnThis()
      mockDb.from.mockReturnThis()
      mockDb.where.mockReturnThis()
      mockDb.limit.mockResolvedValue([share])

      const result = await getExistingShare('user-1', 'user-2')

      expect(result).toEqual(share)
    })

    it('should return null if share does not exist', async () => {
      mockDb.select.mockReturnThis()
      mockDb.from.mockReturnThis()
      mockDb.where.mockReturnThis()
      mockDb.limit.mockResolvedValue([])

      const result = await getExistingShare('user-1', 'user-2')

      expect(result).toBeNull()
    })
  })

  describe('getUserShares', () => {
    it('should return user shares', async () => {
      const shares = [
        { id: 'share-1', ownerId: 'user-1', sharedWithId: 'user-2', access: 'write', createdAt: new Date() },
      ]

      mockDb.select.mockReturnThis()
      mockDb.from.mockReturnThis()
      mockDb.where.mockResolvedValue(shares)

      const result = await getUserShares('user-1')

      expect(result).toEqual(shares)
    })
  })

  describe('getSharedWithUser', () => {
    it('should return shares where user is recipient', async () => {
      const shares = [
        { id: 'share-1', ownerId: 'user-1', sharedWithId: 'user-2', access: 'read', createdAt: new Date() },
      ]

      mockDb.select.mockReturnThis()
      mockDb.from.mockReturnThis()
      mockDb.where.mockResolvedValue(shares)

      const result = await getSharedWithUser('user-2')

      expect(result).toEqual(shares)
    })
  })

  describe('getShareById', () => {
    it('should return share if found', async () => {
      const share = { id: 'share-1', ownerId: 'user-1', sharedWithId: 'user-2', access: 'write' }

      mockDb.select.mockReturnThis()
      mockDb.from.mockReturnThis()
      mockDb.where.mockReturnThis()
      mockDb.limit.mockResolvedValue([share])

      const result = await getShareById('share-1')

      expect(result).toEqual(share)
    })

    it('should return null if share not found', async () => {
      mockDb.select.mockReturnThis()
      mockDb.from.mockReturnThis()
      mockDb.where.mockReturnThis()
      mockDb.limit.mockResolvedValue([])

      const result = await getShareById('nonexistent')

      expect(result).toBeNull()
    })
  })

  describe('createShare', () => {
    it('should create new share successfully', async () => {
      const sharedWithUser = { id: 'user-2', username: 'otheruser' }
      const newShare = {
        id: 'share-1',
        ownerId: 'user-1',
        sharedWithId: 'user-2',
        access: 'write',
        createdAt: new Date(),
      }

      mockDb.select.mockReturnThis()
      mockDb.from.mockReturnThis()
      mockDb.where.mockReturnThis()
      mockDb.limit
        .mockResolvedValueOnce([sharedWithUser])
        .mockResolvedValueOnce([])

      mockDb.insert.mockReturnThis()
      mockDb.values.mockReturnThis()
      mockDb.returning.mockResolvedValue([newShare])

      const result = await createShare({
        ownerId: 'user-1',
        sharedWithUsername: 'otheruser',
        access: 'write',
      })

      expect(result).toEqual(newShare)
      expect(globalThis.crypto.randomUUID).toHaveBeenCalled()
    })

    it('should throw error if user not found', async () => {
      mockDb.select.mockReturnThis()
      mockDb.from.mockReturnThis()
      mockDb.where.mockReturnThis()
      mockDb.limit.mockResolvedValue([])

      await expect(createShare({
        ownerId: 'user-1',
        sharedWithUsername: 'nonexistent',
        access: 'write',
      })).rejects.toThrow('User not found')
    })

    it('should throw error if trying to share with self', async () => {
      const user = { id: 'user-1', username: 'testuser' }

      mockDb.select.mockReturnThis()
      mockDb.from.mockReturnThis()
      mockDb.where.mockReturnThis()
      mockDb.limit.mockResolvedValue([user])

      await expect(createShare({
        ownerId: 'user-1',
        sharedWithUsername: 'testuser',
        access: 'write',
      })).rejects.toThrow('Cannot share with yourself')
    })

    it('should throw error if budget already shared', async () => {
      const sharedWithUser = { id: 'user-2', username: 'otheruser' }
      const existingShare = { id: 'share-1', ownerId: 'user-1', sharedWithId: 'user-2' }

      mockDb.select.mockReturnThis()
      mockDb.from.mockReturnThis()
      mockDb.where.mockReturnThis()
      mockDb.limit
        .mockResolvedValueOnce([sharedWithUser])
        .mockResolvedValueOnce([existingShare])

      await expect(createShare({
        ownerId: 'user-1',
        sharedWithUsername: 'otheruser',
        access: 'write',
      })).rejects.toThrow('Budget already shared with this user')
    })
  })

  describe('updateShare', () => {
    it('should update share successfully', async () => {
      const updatedShare = {
        id: 'share-1',
        ownerId: 'user-1',
        sharedWithId: 'user-2',
        access: 'read',
      }

      mockDb.update.mockReturnThis()
      mockDb.set.mockReturnThis()
      mockDb.where.mockReturnThis()
      mockDb.returning.mockResolvedValue([updatedShare])

      const result = await updateShare('share-1', { access: 'read' })

      expect(result).toEqual(updatedShare)
    })
  })

  describe('deleteShare', () => {
    it('should delete share successfully', async () => {
      const deletedShare = {
        id: 'share-1',
        ownerId: 'user-1',
        sharedWithId: 'user-2',
        access: 'write',
      }

      mockDb.delete.mockReturnThis()
      mockDb.where.mockReturnThis()
      mockDb.returning.mockResolvedValue([deletedShare])

      const result = await deleteShare('share-1')

      expect(result).toEqual(deletedShare)
    })
  })

  describe('checkShareOwnership', () => {
    it('should return true if user owns the share', async () => {
      const share = { id: 'share-1', ownerId: 'user-1', sharedWithId: 'user-2' }

      mockDb.select.mockReturnThis()
      mockDb.from.mockReturnThis()
      mockDb.where.mockReturnThis()
      mockDb.limit.mockResolvedValue([share])

      const result = await checkShareOwnership('share-1', 'user-1')

      expect(result).toBe(true)
    })

    it('should return false if user does not own the share', async () => {
      const share = { id: 'share-1', ownerId: 'user-1', sharedWithId: 'user-2' }

      mockDb.select.mockReturnThis()
      mockDb.from.mockReturnThis()
      mockDb.where.mockReturnThis()
      mockDb.limit.mockResolvedValue([share])

      const result = await checkShareOwnership('share-1', 'user-2')

      expect(result).toBe(false)
    })

    it('should return false if share does not exist', async () => {
      mockDb.select.mockReturnThis()
      mockDb.from.mockReturnThis()
      mockDb.where.mockReturnThis()
      mockDb.limit.mockResolvedValue([])

      const result = await checkShareOwnership('nonexistent', 'user-1')

      expect(result).toBe(false)
    })
  })
})
