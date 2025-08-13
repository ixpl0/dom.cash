import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createError, readBody } from 'h3'
import { z } from 'zod'
import type { H3Event } from 'h3'

import { parseBody } from '~~/server/utils/validation'

vi.mock('h3', () => ({
  createError: vi.fn(),
  readBody: vi.fn(),
}))

let mockCreateError: any
let mockReadBody: any

describe('server/utils/validation', () => {
  beforeEach(async () => {
    vi.clearAllMocks()

    const h3 = await import('h3')

    mockCreateError = h3.createError as ReturnType<typeof vi.fn>
    mockReadBody = h3.readBody as ReturnType<typeof vi.fn>
  })

  describe('parseBody', () => {
    it('should parse valid body successfully', async () => {
      const mockEvent = {} as H3Event
      const schema = z.object({
        name: z.string(),
        age: z.number(),
      })
      const validData = { name: 'John', age: 30 }

      mockReadBody.mockResolvedValue(validData)

      const result = await parseBody(mockEvent, schema)

      expect(mockReadBody).toHaveBeenCalledWith(mockEvent)
      expect(result).toEqual(validData)
      expect(mockCreateError).not.toHaveBeenCalled()
    })

    it('should throw error for invalid data', async () => {
      const mockEvent = {} as H3Event
      const schema = z.object({
        name: z.string(),
        age: z.number(),
      })
      const invalidData = { name: 'John', age: 'invalid' }

      mockReadBody.mockResolvedValue(invalidData)
      const error = new Error('Validation failed')
      mockCreateError.mockReturnValue(error)

      await expect(parseBody(mockEvent, schema)).rejects.toThrow('Validation failed')

      expect(mockReadBody).toHaveBeenCalledWith(mockEvent)
      expect(mockCreateError).toHaveBeenCalledWith({
        statusCode: 400,
        statusMessage: expect.stringContaining('expected number, received string'),
      })
    })

    it('should handle missing required fields', async () => {
      const mockEvent = {} as H3Event
      const schema = z.object({
        name: z.string(),
        email: z.string().email(),
      })
      const invalidData = { name: 'John' }

      mockReadBody.mockResolvedValue(invalidData)
      const error = new Error('Validation failed')
      mockCreateError.mockReturnValue(error)

      await expect(parseBody(mockEvent, schema)).rejects.toThrow('Validation failed')

      expect(mockCreateError).toHaveBeenCalledWith({
        statusCode: 400,
        statusMessage: expect.stringContaining('expected string, received undefined'),
      })
    })

    it('should handle multiple validation errors', async () => {
      const mockEvent = {} as H3Event
      const schema = z.object({
        name: z.string().min(2),
        age: z.number().min(0),
        email: z.string().email(),
      })
      const invalidData = { name: 'J', age: -1, email: 'invalid-email' }

      mockReadBody.mockResolvedValue(invalidData)
      const error = new Error('Multiple validation errors')
      mockCreateError.mockReturnValue(error)

      await expect(parseBody(mockEvent, schema)).rejects.toThrow('Multiple validation errors')

      expect(mockCreateError).toHaveBeenCalledWith({
        statusCode: 400,
        statusMessage: expect.stringMatching(/.*; .*; .*/), // Contains semicolons (multiple errors)
      })
    })

    it('should handle empty body', async () => {
      const mockEvent = {} as H3Event
      const schema = z.object({
        name: z.string(),
      })

      mockReadBody.mockResolvedValue({})
      const error = new Error('Validation failed')
      mockCreateError.mockReturnValue(error)

      await expect(parseBody(mockEvent, schema)).rejects.toThrow('Validation failed')

      expect(mockCreateError).toHaveBeenCalledWith({
        statusCode: 400,
        statusMessage: expect.stringContaining('expected string, received undefined'),
      })
    })

    it('should handle null body', async () => {
      const mockEvent = {} as H3Event
      const schema = z.object({
        name: z.string(),
      })

      mockReadBody.mockResolvedValue(null)
      const error = new Error('Validation failed')
      mockCreateError.mockReturnValue(error)

      await expect(parseBody(mockEvent, schema)).rejects.toThrow('Validation failed')
    })

    it('should work with array schemas', async () => {
      const mockEvent = {} as H3Event
      const schema = z.array(z.string())
      const validData = ['item1', 'item2', 'item3']

      mockReadBody.mockResolvedValue(validData)

      const result = await parseBody(mockEvent, schema)

      expect(result).toEqual(validData)
    })

    it('should work with nested object schemas', async () => {
      const mockEvent = {} as H3Event
      const schema = z.object({
        user: z.object({
          name: z.string(),
          profile: z.object({
            age: z.number(),
          }),
        }),
      })
      const validData = {
        user: {
          name: 'John',
          profile: {
            age: 30,
          },
        },
      }

      mockReadBody.mockResolvedValue(validData)

      const result = await parseBody(mockEvent, schema)

      expect(result).toEqual(validData)
    })

    it('should handle readBody errors', async () => {
      const mockEvent = {} as H3Event
      const schema = z.object({ name: z.string() })
      const readError = new Error('Failed to read body')

      mockReadBody.mockRejectedValue(readError)

      await expect(parseBody(mockEvent, schema)).rejects.toThrow('Failed to read body')

      expect(mockReadBody).toHaveBeenCalledWith(mockEvent)
      expect(mockCreateError).not.toHaveBeenCalled()
    })

    it('should handle optional fields correctly', async () => {
      const mockEvent = {} as H3Event
      const schema = z.object({
        name: z.string(),
        age: z.number().optional(),
      })
      const validData = { name: 'John' }

      mockReadBody.mockResolvedValue(validData)

      const result = await parseBody(mockEvent, schema)

      expect(result).toEqual({ name: 'John', age: undefined })
    })
  })
})
