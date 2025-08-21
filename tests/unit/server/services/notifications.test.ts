import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  addConnection,
  removeConnection,
  subscribeToBudget,
  unsubscribeFromBudget,
  getBudgetSubscribers,
  sendNotificationToUser,
  createNotification,
  getActiveConnections,
  getBudgetSubscriptions,
} from '~~/server/services/notifications'
import type { NotificationEvent } from '~~/server/services/notifications'

describe('notifications service', () => {
  beforeEach(() => {
    getActiveConnections().clear()
    getBudgetSubscriptions().clear()
  })

  describe('connection management', () => {
    it('should add and remove connections', () => {
      const mockConnection = {
        write: vi.fn(),
        close: vi.fn(),
      }

      addConnection('user1', mockConnection)
      expect(getActiveConnections().size).toBe(1)
      expect(getActiveConnections().has('user1')).toBe(true)

      removeConnection('user1')
      expect(getActiveConnections().size).toBe(0)
      expect(getActiveConnections().has('user1')).toBe(false)
    })

    it('should remove user from all budget subscriptions when removing connection', () => {
      const mockConnection = {
        write: vi.fn(),
        close: vi.fn(),
      }

      addConnection('user1', mockConnection)
      subscribeToBudget('user1', 'budget1')
      subscribeToBudget('user1', 'budget2')

      expect(getBudgetSubscriptions().get('budget1')?.has('user1')).toBe(true)
      expect(getBudgetSubscriptions().get('budget2')?.has('user1')).toBe(true)

      removeConnection('user1')

      expect(getBudgetSubscriptions().has('budget1')).toBe(false)
      expect(getBudgetSubscriptions().has('budget2')).toBe(false)
    })
  })

  describe('budget subscriptions', () => {
    it('should subscribe and unsubscribe from budgets', () => {
      subscribeToBudget('user1', 'budget1')

      expect(getBudgetSubscriptions().get('budget1')?.has('user1')).toBe(true)
      expect(getBudgetSubscribers('budget1')).toEqual(['user1'])

      unsubscribeFromBudget('user1', 'budget1')
      expect(getBudgetSubscriptions().has('budget1')).toBe(false)
      expect(getBudgetSubscribers('budget1')).toEqual([])
    })

    it('should handle multiple users for same budget', () => {
      subscribeToBudget('user1', 'budget1')
      subscribeToBudget('user2', 'budget1')

      expect(getBudgetSubscribers('budget1')).toEqual(['user1', 'user2'])

      unsubscribeFromBudget('user1', 'budget1')
      expect(getBudgetSubscribers('budget1')).toEqual(['user2'])
    })

    it('should clean up empty budget subscriptions', () => {
      subscribeToBudget('user1', 'budget1')
      expect(getBudgetSubscriptions().has('budget1')).toBe(true)

      unsubscribeFromBudget('user1', 'budget1')
      expect(getBudgetSubscriptions().has('budget1')).toBe(false)
    })
  })

  describe('sendNotificationToUser', () => {
    it('should send notification to connected user', () => {
      const mockConnection = {
        write: vi.fn(),
        close: vi.fn(),
      }

      addConnection('user1', mockConnection)

      const notification: NotificationEvent = {
        id: 'notif1',
        type: 'budget_entry_created',
        message: 'Test message',
        sourceUsername: 'user2',
        budgetOwnerUsername: 'user1',
        createdAt: new Date(),
      }

      sendNotificationToUser('user1', notification)

      expect(mockConnection.write).toHaveBeenCalledWith(
        `data: ${JSON.stringify(notification)}\n\n`,
      )
    })

    it('should handle write error by removing connection', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      const mockConnection = {
        write: vi.fn().mockImplementation(() => {
          throw new Error('Connection error')
        }),
        close: vi.fn(),
      }

      addConnection('user1', mockConnection)

      const notification: NotificationEvent = {
        id: 'notif1',
        type: 'budget_entry_created',
        message: 'Test message',
        sourceUsername: 'user2',
        budgetOwnerUsername: 'user1',
        createdAt: new Date(),
      }

      sendNotificationToUser('user1', notification)

      expect(getActiveConnections().has('user1')).toBe(false)
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error sending notification to user:', expect.any(Error))
      
      consoleErrorSpy.mockRestore()
    })

    it('should do nothing if user not connected', () => {
      const notification: NotificationEvent = {
        id: 'notif1',
        type: 'budget_entry_created',
        message: 'Test message',
        sourceUsername: 'user2',
        budgetOwnerUsername: 'user1',
        createdAt: new Date(),
      }

      expect(() => sendNotificationToUser('user1', notification)).not.toThrow()
    })
  })

  describe('createNotification', () => {
    it('should send notifications to all subscribers except initiator', async () => {
      const mockConnection1 = { write: vi.fn(), close: vi.fn() }
      const mockConnection2 = { write: vi.fn(), close: vi.fn() }
      const mockConnection3 = { write: vi.fn(), close: vi.fn() }

      addConnection('user1', mockConnection1)
      addConnection('user2', mockConnection2)
      addConnection('user3', mockConnection3)

      subscribeToBudget('user1', 'budget1')
      subscribeToBudget('user2', 'budget1')

      await createNotification({
        sourceUserId: 'user1',
        budgetOwnerId: 'budget1',
        type: 'budget_entry_created',
        message: 'Test notification',
      })

      expect(mockConnection1.write).not.toHaveBeenCalled()
      expect(mockConnection2.write).toHaveBeenCalled()
      expect(mockConnection3.write).not.toHaveBeenCalled()
    })

    it('should include budget owner in recipients if not subscribed', async () => {
      const mockConnection1 = { write: vi.fn(), close: vi.fn() }
      const mockConnection2 = { write: vi.fn(), close: vi.fn() }

      addConnection('user1', mockConnection1)
      addConnection('budgetOwner', mockConnection2)

      subscribeToBudget('user1', 'budgetOwner')

      await createNotification({
        sourceUserId: 'user1',
        budgetOwnerId: 'budgetOwner',
        type: 'budget_entry_created',
        message: 'Test notification',
      })

      expect(mockConnection2.write).toHaveBeenCalled()
    })

    it('should do nothing if no subscribers', async () => {
      await expect(createNotification({
        sourceUserId: 'user1',
        budgetOwnerId: 'budget1',
        type: 'budget_entry_created',
        message: 'Test notification',
      })).resolves.not.toThrow()
    })

    it('should not send to initiator even if they are budget owner', async () => {
      const mockConnection = { write: vi.fn(), close: vi.fn() }
      addConnection('budgetOwner', mockConnection)

      await createNotification({
        sourceUserId: 'budgetOwner',
        budgetOwnerId: 'budgetOwner',
        type: 'budget_entry_created',
        message: 'Test notification',
      })

      expect(mockConnection.write).not.toHaveBeenCalled()
    })
  })
})
