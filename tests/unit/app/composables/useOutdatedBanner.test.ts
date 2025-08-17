import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useOutdatedBanner } from '~~/app/composables/useOutdatedBanner'

describe('useOutdatedBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should set and call banner reference', () => {
    const { setWarningBannerRef, showWarningBanner, hideWarningBanner } = useOutdatedBanner()

    const mockBannerRef = {
      show: vi.fn(),
      hide: vi.fn(),
    }

    setWarningBannerRef(mockBannerRef)

    showWarningBanner()
    expect(mockBannerRef.show).toHaveBeenCalledOnce()

    hideWarningBanner()
    expect(mockBannerRef.hide).toHaveBeenCalledOnce()
  })

  it('should handle null banner reference gracefully', () => {
    const { setWarningBannerRef, showWarningBanner, hideWarningBanner } = useOutdatedBanner()

    setWarningBannerRef(null)

    expect(() => showWarningBanner()).not.toThrow()
    expect(() => hideWarningBanner()).not.toThrow()
  })

  it('should handle calling functions without setting reference', () => {
    const { showWarningBanner, hideWarningBanner } = useOutdatedBanner()

    expect(() => showWarningBanner()).not.toThrow()
    expect(() => hideWarningBanner()).not.toThrow()
  })

  it('should replace banner reference when called multiple times', () => {
    const { setWarningBannerRef, showWarningBanner } = useOutdatedBanner()

    const firstRef = { show: vi.fn(), hide: vi.fn() }
    const secondRef = { show: vi.fn(), hide: vi.fn() }

    setWarningBannerRef(firstRef)
    setWarningBannerRef(secondRef)

    showWarningBanner()

    expect(firstRef.show).not.toHaveBeenCalled()
    expect(secondRef.show).toHaveBeenCalledOnce()
  })
})
