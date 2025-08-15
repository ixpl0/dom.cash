import { describe, it, expect } from 'vitest'
import type {
  User,
  NewUser,
  Session,
  NewSession,
  Currency,
  NewCurrency,
  CurrencyRates,
  Month,
  NewMonth,
  Entry,
  NewEntry,
  EntryKind,
  BudgetShare,
  NewBudgetShare,
  BudgetShareAccess,
} from '~~/server/db/schema'

describe('Database Schema Types', () => {
  describe('User types', () => {
    it('should define User type correctly', () => {
      const user: User = {
        id: 'user-1',
        username: 'testuser',
        passwordHash: 'hash123',
        mainCurrency: 'USD',
        createdAt: new Date(),
      }

      expect(user.id).toBe('user-1')
      expect(user.username).toBe('testuser')
      expect(user.passwordHash).toBe('hash123')
      expect(user.mainCurrency).toBe('USD')
      expect(user.createdAt).toBeInstanceOf(Date)
    })

    it('should define NewUser type correctly', () => {
      const newUser: NewUser = {
        id: 'user-1',
        username: 'testuser',
        passwordHash: 'hash123',
        mainCurrency: 'USD',
        createdAt: new Date(),
      }

      expect(newUser.id).toBe('user-1')
      expect(newUser.username).toBe('testuser')
    })
  })

  describe('Session types', () => {
    it('should define Session type correctly', () => {
      const session: Session = {
        id: 'session-1',
        userId: 'user-1',
        tokenHash: 'token-hash',
        expiresAt: new Date(),
        createdAt: new Date(),
      }

      expect(session.id).toBe('session-1')
      expect(session.userId).toBe('user-1')
      expect(session.tokenHash).toBe('token-hash')
      expect(session.expiresAt).toBeInstanceOf(Date)
      expect(session.createdAt).toBeInstanceOf(Date)
    })

    it('should define NewSession type correctly', () => {
      const newSession: NewSession = {
        id: 'session-1',
        userId: 'user-1',
        tokenHash: 'token-hash',
        expiresAt: new Date(),
        createdAt: new Date(),
      }

      expect(newSession.id).toBe('session-1')
      expect(newSession.userId).toBe('user-1')
    })
  })

  describe('Currency types', () => {
    it('should define Currency type correctly', () => {
      const currency: Currency = {
        date: '2024-01-01',
        rates: { USD: 1, EUR: 0.85, GBP: 0.75 },
      }

      expect(currency.date).toBe('2024-01-01')
      expect(currency.rates).toEqual({ USD: 1, EUR: 0.85, GBP: 0.75 })
    })

    it('should define NewCurrency type correctly', () => {
      const newCurrency: NewCurrency = {
        date: '2024-01-01',
        rates: { USD: 1, EUR: 0.85 },
      }

      expect(newCurrency.date).toBe('2024-01-01')
      expect(newCurrency.rates).toEqual({ USD: 1, EUR: 0.85 })
    })

    it('should define CurrencyRates type correctly', () => {
      const rates: CurrencyRates = {
        USD: 1,
        EUR: 0.85,
        GBP: 0.75,
        JPY: 150,
      }

      expect(rates.USD).toBe(1)
      expect(rates.EUR).toBe(0.85)
      expect(rates.GBP).toBe(0.75)
      expect(rates.JPY).toBe(150)
    })
  })

  describe('Month types', () => {
    it('should define Month type correctly', () => {
      const month: Month = {
        id: 'month-1',
        userId: 'user-1',
        year: 2024,
        month: 0,
      }

      expect(month.id).toBe('month-1')
      expect(month.userId).toBe('user-1')
      expect(month.year).toBe(2024)
      expect(month.month).toBe(0)
    })

    it('should define NewMonth type correctly', () => {
      const newMonth: NewMonth = {
        id: 'month-1',
        userId: 'user-1',
        year: 2024,
        month: 11,
      }

      expect(newMonth.id).toBe('month-1')
      expect(newMonth.userId).toBe('user-1')
      expect(newMonth.year).toBe(2024)
      expect(newMonth.month).toBe(11)
    })
  })

  describe('Entry types', () => {
    it('should define Entry type correctly', () => {
      const entry: Entry = {
        id: 'entry-1',
        monthId: 'month-1',
        kind: 'income',
        description: 'Salary',
        amount: 5000,
        currency: 'USD',
        date: '2024-01-15',
      }

      expect(entry.id).toBe('entry-1')
      expect(entry.monthId).toBe('month-1')
      expect(entry.kind).toBe('income')
      expect(entry.description).toBe('Salary')
      expect(entry.amount).toBe(5000)
      expect(entry.currency).toBe('USD')
      expect(entry.date).toBe('2024-01-15')
    })

    it('should define NewEntry type correctly', () => {
      const newEntry: NewEntry = {
        id: 'entry-1',
        monthId: 'month-1',
        kind: 'expense',
        description: 'Rent',
        amount: 1500,
        currency: 'USD',
        date: null,
      }

      expect(newEntry.id).toBe('entry-1')
      expect(newEntry.monthId).toBe('month-1')
      expect(newEntry.kind).toBe('expense')
      expect(newEntry.description).toBe('Rent')
      expect(newEntry.amount).toBe(1500)
      expect(newEntry.currency).toBe('USD')
      expect(newEntry.date).toBeNull()
    })

    it('should define EntryKind union type correctly', () => {
      const incomeKind: EntryKind = 'income'
      const expenseKind: EntryKind = 'expense'
      const balanceKind: EntryKind = 'balance'

      expect(incomeKind).toBe('income')
      expect(expenseKind).toBe('expense')
      expect(balanceKind).toBe('balance')
    })
  })

  describe('BudgetShare types', () => {
    it('should define BudgetShare type correctly', () => {
      const budgetShare: BudgetShare = {
        id: 'share-1',
        ownerId: 'user-1',
        sharedWithId: 'user-2',
        access: 'write',
        createdAt: new Date(),
      }

      expect(budgetShare.id).toBe('share-1')
      expect(budgetShare.ownerId).toBe('user-1')
      expect(budgetShare.sharedWithId).toBe('user-2')
      expect(budgetShare.access).toBe('write')
      expect(budgetShare.createdAt).toBeInstanceOf(Date)
    })

    it('should define NewBudgetShare type correctly', () => {
      const newBudgetShare: NewBudgetShare = {
        id: 'share-1',
        ownerId: 'user-1',
        sharedWithId: 'user-2',
        access: 'read',
        createdAt: new Date(),
      }

      expect(newBudgetShare.id).toBe('share-1')
      expect(newBudgetShare.ownerId).toBe('user-1')
      expect(newBudgetShare.sharedWithId).toBe('user-2')
      expect(newBudgetShare.access).toBe('read')
    })

    it('should define BudgetShareAccess union type correctly', () => {
      const readAccess: BudgetShareAccess = 'read'
      const writeAccess: BudgetShareAccess = 'write'

      expect(readAccess).toBe('read')
      expect(writeAccess).toBe('write')
    })
  })

  describe('Type relationships', () => {
    it('should work with all entry kinds', () => {
      const incomeEntry: Entry = {
        id: 'entry-1',
        monthId: 'month-1',
        kind: 'income',
        description: 'Salary',
        amount: 5000,
        currency: 'USD',
        date: '2024-01-15',
      }

      const expenseEntry: Entry = {
        id: 'entry-2',
        monthId: 'month-1',
        kind: 'expense',
        description: 'Rent',
        amount: 1500,
        currency: 'USD',
        date: '2024-01-01',
      }

      const balanceEntry: Entry = {
        id: 'entry-3',
        monthId: 'month-1',
        kind: 'balance',
        description: 'Opening balance',
        amount: 1000,
        currency: 'USD',
        date: null,
      }

      expect(incomeEntry.kind).toBe('income')
      expect(expenseEntry.kind).toBe('expense')
      expect(balanceEntry.kind).toBe('balance')
    })

    it('should work with both access levels', () => {
      const readShare: BudgetShare = {
        id: 'share-1',
        ownerId: 'user-1',
        sharedWithId: 'user-2',
        access: 'read',
        createdAt: new Date(),
      }

      const writeShare: BudgetShare = {
        id: 'share-2',
        ownerId: 'user-1',
        sharedWithId: 'user-3',
        access: 'write',
        createdAt: new Date(),
      }

      expect(readShare.access).toBe('read')
      expect(writeShare.access).toBe('write')
    })
  })
})
