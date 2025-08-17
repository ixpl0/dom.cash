import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useToast } from '~~/app/composables/useToast'

vi.stubGlobal('crypto', {
  randomUUID: vi.fn(() => 'test-uuid'),
})

const mockSetTimeout = vi.fn(() => {
  return 1
})
vi.stubGlobal('setTimeout', mockSetTimeout)

describe('useToast', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSetTimeout.mockClear()
    const { clearAllToasts } = useToast()
    clearAllToasts()
  })

  it('should create toast with default values', () => {
    const { toast, toasts } = useToast()

    toast({ message: 'Test message' })

    expect(toasts.value).toHaveLength(1)
    expect(toasts.value[0]).toEqual({
      id: 'test-uuid',
      type: 'warning',
      message: 'Test message',
      timeout: 7000,
    })
  })

  it('should create toast with custom values', () => {
    const { toast, toasts } = useToast()

    toast({
      type: 'success',
      message: 'Success message',
      timeout: 3000,
    })

    expect(toasts.value[0]).toEqual({
      id: 'test-uuid',
      type: 'success',
      message: 'Success message',
      timeout: 3000,
    })
  })

  it('should remove toast after timeout', () => {
    const { toast, toasts } = useToast()

    toast({ message: 'Test message' })

    expect(mockSetTimeout).toHaveBeenCalledWith(expect.any(Function), 7000)
    expect(toasts.value).toHaveLength(1)

    const timeoutCallback = mockSetTimeout.mock.calls[0][0]
    timeoutCallback()
    expect(toasts.value).toHaveLength(0)
  })

  it('should not set timeout for zero timeout', () => {
    mockSetTimeout.mockClear()
    const { toast } = useToast()

    toast({ message: 'Test message', timeout: 0 })

    expect(mockSetTimeout).not.toHaveBeenCalled()
  })

  it('should manually remove toast', () => {
    const realSetTimeout = globalThis.setTimeout
    vi.stubGlobal('setTimeout', realSetTimeout)

    const { toast, toasts, removeToast } = useToast()

    toast({ message: 'Test message', timeout: 0 })
    expect(toasts.value).toHaveLength(1)

    removeToast('test-uuid')
    expect(toasts.value).toHaveLength(0)
  })

  it('should handle removing non-existent toast', () => {
    const { toasts, removeToast } = useToast()

    expect(() => removeToast('non-existent')).not.toThrow()
    expect(toasts.value).toHaveLength(0)
  })

  it('should clear all toasts', () => {
    const { toast, toasts, clearAllToasts } = useToast()

    toast({ message: 'Test 1', timeout: 0 })
    toast({ message: 'Test 2', timeout: 0 })
    expect(toasts.value).toHaveLength(2)

    clearAllToasts()
    expect(toasts.value).toHaveLength(0)
  })

  it('should return toast id from toast function', () => {
    const { toast } = useToast()

    const id = toast({ message: 'Test message' })
    expect(id).toBe('test-uuid')
  })
})
