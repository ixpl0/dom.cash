import { vi } from 'vitest'
import { createMockEvent, createMockDatabase, mockUseDatabase } from './utils/mock-database'

// Mock useDatabase function
vi.mock('~~/server/db', () => ({
  useDatabase: mockUseDatabase,
  // Экспортируем db для обратной совместимости старых тестов
  db: createMockDatabase(),
}))

// По умолчанию mockUseDatabase возвращает mock database
mockUseDatabase.mockImplementation(() => createMockDatabase())

// Global test utilities
;(global as any).createMockEvent = createMockEvent
;(global as any).createMockDatabase = createMockDatabase

// Mock crypto для тестов
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: () => 'test-uuid-' + Math.random().toString(36).substring(7),
    getRandomValues: (arr: Uint8Array) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256)
      }
      return arr
    },
    subtle: {
      importKey: vi.fn().mockResolvedValue({}),
      deriveBits: vi.fn().mockResolvedValue(new ArrayBuffer(32)),
    },
  },
})

// Mock atob/btoa для base64 кодирования
Object.defineProperty(global, 'atob', {
  value: vi.fn().mockImplementation((str: string) => {
    return Buffer.from(str, 'base64').toString('binary')
  }),
})

Object.defineProperty(global, 'btoa', {
  value: vi.fn().mockImplementation((str: string) => {
    return Buffer.from(str, 'binary').toString('base64')
  }),
})
