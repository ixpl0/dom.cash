import { describe, it, expect } from 'vitest'
import { setup } from '@nuxt/test-utils/e2e'
import { setupTestDatabase, createTestShare } from './helpers/database'
import { createAuthenticatedUser, makeAuthenticatedRequest } from './helpers/auth'

describe('Budget Sharing API Integration', async () => {
  await setup({
    rootDir: __dirname + '/../..',
  })

  setupTestDatabase()

  describe('GET /api/budget/sharing', () => {
    it('should return user shares', async () => {
      const authContext1 = await createAuthenticatedUser({ username: 'owner', password: 'pass1' })
      const authContext2 = await createAuthenticatedUser({ username: 'shared1', password: 'pass2' })
      const authContext3 = await createAuthenticatedUser({ username: 'shared2', password: 'pass3' })

      await createTestShare(authContext1.user.id, authContext2.user.id, 'read')
      await createTestShare(authContext1.user.id, authContext3.user.id, 'write')

      const response = await makeAuthenticatedRequest('/api/budget/sharing', authContext1)

      expect(response).toMatchObject({
        myShares: expect.arrayContaining([
          expect.objectContaining({
            ownerId: authContext1.user.id,
            sharedWithId: authContext2.user.id,
            access: 'read',
          }),
          expect.objectContaining({
            ownerId: authContext1.user.id,
            sharedWithId: authContext3.user.id,
            access: 'write',
          }),
        ]),
        sharedWithMe: [],
      })
    })

    it('should return shares shared with user', async () => {
      const authContext1 = await createAuthenticatedUser({ username: 'owner1', password: 'pass1' })
      const authContext2 = await createAuthenticatedUser({ username: 'owner2', password: 'pass2' })
      const authContext3 = await createAuthenticatedUser({ username: 'recipient', password: 'pass3' })

      await createTestShare(authContext1.user.id, authContext3.user.id, 'read')
      await createTestShare(authContext2.user.id, authContext3.user.id, 'write')

      const response = await makeAuthenticatedRequest('/api/budget/sharing', authContext3)

      expect(response).toMatchObject({
        myShares: [],
        sharedWithMe: expect.arrayContaining([
          expect.objectContaining({
            ownerId: authContext1.user.id,
            sharedWithId: authContext3.user.id,
            access: 'read',
          }),
          expect.objectContaining({
            ownerId: authContext2.user.id,
            sharedWithId: authContext3.user.id,
            access: 'write',
          }),
        ]),
      })
    })

    it('should return empty arrays for user without shares', async () => {
      const authContext = await createAuthenticatedUser()

      const response = await makeAuthenticatedRequest('/api/budget/sharing', authContext)

      expect(response).toMatchObject({
        myShares: [],
        sharedWithMe: [],
      })
    })
  })

  describe('POST /api/budget/sharing', () => {
    it('should create new share', async () => {
      const authContext1 = await createAuthenticatedUser({ username: 'owner', password: 'pass1' })
      const authContext2 = await createAuthenticatedUser({ username: 'recipient', password: 'pass2' })

      const shareData = {
        sharedWithUsername: authContext2.user.username,
        access: 'read' as const,
      }

      const response = await makeAuthenticatedRequest('/api/budget/sharing', authContext1, {
        method: 'POST',
        body: shareData,
      })

      expect(response).toMatchObject({
        id: expect.any(String),
        ownerId: authContext1.user.id,
        sharedWithId: authContext2.user.id,
        access: 'read',
        createdAt: expect.any(String),
      })
    })

    it('should create write access share', async () => {
      const authContext1 = await createAuthenticatedUser({ username: 'owner', password: 'pass1' })
      const authContext2 = await createAuthenticatedUser({ username: 'writer', password: 'pass2' })

      const response = await makeAuthenticatedRequest('/api/budget/sharing', authContext1, {
        method: 'POST',
        body: {
          sharedWithUsername: authContext2.user.username,
          access: 'write',
        },
      })

      expect(response).toMatchObject({
        ownerId: authContext1.user.id,
        sharedWithId: authContext2.user.id,
        access: 'write',
      })
    })

    it('should reject sharing with non-existent user', async () => {
      const authContext = await createAuthenticatedUser()

      await expect(makeAuthenticatedRequest('/api/budget/sharing', authContext, {
        method: 'POST',
        body: {
          sharedWithUsername: 'nonexistent',
          access: 'read',
        },
      })).rejects.toThrow()
    })

    it('should reject sharing with self', async () => {
      const authContext = await createAuthenticatedUser()

      await expect(makeAuthenticatedRequest('/api/budget/sharing', authContext, {
        method: 'POST',
        body: {
          sharedWithUsername: authContext.user.username,
          access: 'read',
        },
      })).rejects.toThrow()
    })

    it('should reject duplicate share', async () => {
      const authContext1 = await createAuthenticatedUser({ username: 'owner', password: 'pass1' })
      const authContext2 = await createAuthenticatedUser({ username: 'recipient', password: 'pass2' })

      await createTestShare(authContext1.user.id, authContext2.user.id, 'read')

      await expect(makeAuthenticatedRequest('/api/budget/sharing', authContext1, {
        method: 'POST',
        body: {
          sharedWithUsername: authContext2.user.username,
          access: 'write',
        },
      })).rejects.toThrow()
    })
  })

  describe('PUT /api/budget/sharing/[id]', () => {
    it('should update share access', async () => {
      const authContext1 = await createAuthenticatedUser({ username: 'owner', password: 'pass1' })
      const authContext2 = await createAuthenticatedUser({ username: 'recipient', password: 'pass2' })
      const testShare = await createTestShare(authContext1.user.id, authContext2.user.id, 'read')

      const response = await makeAuthenticatedRequest(`/api/budget/sharing/${testShare.id}`, authContext1, {
        method: 'PUT',
        body: {
          access: 'write',
        },
      })

      expect(response).toMatchObject({
        id: testShare.id,
        access: 'write',
      })
    })

    it('should reject update by non-owner', async () => {
      const authContext1 = await createAuthenticatedUser({ username: 'owner', password: 'pass1' })
      const authContext2 = await createAuthenticatedUser({ username: 'recipient', password: 'pass2' })
      const testShare = await createTestShare(authContext1.user.id, authContext2.user.id, 'read')

      await expect(makeAuthenticatedRequest(`/api/budget/sharing/${testShare.id}`, authContext2, {
        method: 'PUT',
        body: {
          access: 'write',
        },
      })).rejects.toThrow()
    })

    it('should reject update of non-existent share', async () => {
      const authContext = await createAuthenticatedUser()

      await expect(makeAuthenticatedRequest('/api/budget/sharing/non-existent', authContext, {
        method: 'PUT',
        body: {
          access: 'write',
        },
      })).rejects.toThrow()
    })
  })

  describe('DELETE /api/budget/sharing/[id]', () => {
    it('should delete share', async () => {
      const authContext1 = await createAuthenticatedUser({ username: 'owner', password: 'pass1' })
      const authContext2 = await createAuthenticatedUser({ username: 'recipient', password: 'pass2' })
      const testShare = await createTestShare(authContext1.user.id, authContext2.user.id, 'read')

      const response = await makeAuthenticatedRequest(`/api/budget/sharing/${testShare.id}`, authContext1, {
        method: 'DELETE',
      })

      expect(response).toMatchObject({
        success: true,
      })

      const sharesResponse = await makeAuthenticatedRequest('/api/budget/sharing', authContext1) as any
      expect(sharesResponse.myShares).toHaveLength(0)
    })

    it('should reject delete by non-owner', async () => {
      const authContext1 = await createAuthenticatedUser({ username: 'owner', password: 'pass1' })
      const authContext2 = await createAuthenticatedUser({ username: 'recipient', password: 'pass2' })
      const testShare = await createTestShare(authContext1.user.id, authContext2.user.id, 'read')

      await expect(makeAuthenticatedRequest(`/api/budget/sharing/${testShare.id}`, authContext2, {
        method: 'DELETE',
      })).rejects.toThrow()
    })

    it('should reject delete of non-existent share', async () => {
      const authContext = await createAuthenticatedUser()

      await expect(makeAuthenticatedRequest('/api/budget/sharing/non-existent', authContext, {
        method: 'DELETE',
      })).rejects.toThrow()
    })
  })
})
