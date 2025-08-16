import { describe, it, expect } from 'vitest'
import { setup, $fetch } from '@nuxt/test-utils/e2e'
import { setupTestDatabase } from './helpers/database'
import { createAuthenticatedUser, logout, makeAuthenticatedRequest } from './helpers/auth'

describe('Auth API Integration', async () => {
  await setup({
    rootDir: __dirname + '/../..',
  })

  setupTestDatabase()

  describe('POST /api/auth (login)', () => {
    it('should login with valid credentials', async () => {
      const userData = { username: 'testuser', password: 'testpassword123' }

      const response = await $fetch('/api/auth', {
        method: 'POST',
        body: userData,
      })

      expect(response).toMatchObject({
        id: expect.any(String),
        username: 'testuser',
        mainCurrency: 'USD',
      })
    })

    it('should reject invalid credentials', async () => {
      const authContext = await createAuthenticatedUser({ username: 'testuser', password: 'testpassword123' })

      await expect($fetch('/api/auth', {
        method: 'POST',
        body: {
          username: authContext.user.username,
          password: 'wrongpassword',
        },
      })).rejects.toThrow()
    })

    it('should create non-existent user', async () => {
      const response = await $fetch('/api/auth', {
        method: 'POST',
        body: {
          username: 'newuser',
          password: 'newpassword123',
        },
      })

      expect(response).toMatchObject({
        id: expect.any(String),
        username: 'newuser',
        mainCurrency: 'USD',
      })
    })

    it('should validate required fields', async () => {
      await expect($fetch('/api/auth', {
        method: 'POST',
        body: {
          username: '',
          password: 'password',
        },
      })).rejects.toThrow()

      await expect($fetch('/api/auth', {
        method: 'POST',
        body: {
          username: 'user',
          password: '',
        },
      })).rejects.toThrow()
    })
  })

  describe('GET /api/auth/me', () => {
    it('should return user info when authenticated', async () => {
      const authContext = await createAuthenticatedUser()

      const response = await makeAuthenticatedRequest('/api/auth/me', authContext)

      expect(response).toMatchObject({
        id: authContext.user.id,
        username: authContext.user.username,
      })
      expect(response).not.toHaveProperty('password')
    })

    it('should reject unauthenticated requests', async () => {
      await expect($fetch('/api/auth/me')).rejects.toThrow()
    })

    it('should reject invalid session', async () => {
      await expect($fetch('/api/auth/me', {
        headers: {
          cookie: 'session=invalid-token',
        },
      })).rejects.toThrow()
    })
  })

  describe('POST /api/auth/logout', () => {
    it('should logout authenticated user', async () => {
      const authContext = await createAuthenticatedUser()

      const response = await logout(authContext)

      expect(response).toMatchObject({
        success: true,
      })

      await expect(makeAuthenticatedRequest('/api/auth/me', authContext)).rejects.toThrow()
    })

    it('should handle logout without session gracefully', async () => {
      const response = await $fetch('/api/auth/logout', {
        method: 'POST',
      })

      expect(response).toMatchObject({
        success: true,
      })
    })
  })
})
