import { vi } from 'vitest'

export const createMockFetch = () => {
  const mockFetch = vi.fn()

  const mockSuccessResponse = (data: unknown) => ({
    ok: true,
    status: 200,
    json: vi.fn().mockResolvedValue(data),
  })

  const mockErrorResponse = (status: number, statusText: string) => ({
    ok: false,
    status,
    statusText,
    json: vi.fn().mockRejectedValue(new Error(`HTTP ${status}: ${statusText}`)),
  })

  const mockNetworkError = () => {
    mockFetch.mockRejectedValue(new Error('Network error'))
  }

  return {
    mockFetch,
    mockSuccessResponse,
    mockErrorResponse,
    mockNetworkError,

    // Настройки для разных сценариев
    setupSuccessfulResponse: (data: unknown) => {
      mockFetch.mockResolvedValue(mockSuccessResponse(data))
    },

    setupErrorResponse: (status: number, statusText: string) => {
      mockFetch.mockResolvedValue(mockErrorResponse(status, statusText))
    },

    setupNetworkError: () => {
      mockNetworkError()
    },

    reset: () => {
      mockFetch.mockReset()
    },
  }
}
