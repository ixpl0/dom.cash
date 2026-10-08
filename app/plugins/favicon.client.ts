import type { FaviconColors } from '~/utils/favicon'
import { COOKIE_NAMES, UI_COOKIE_OPTIONS } from '~/utils/cookies'
import { generateFaviconSvg } from '~/utils/favicon'

export default defineNuxtPlugin(() => {
  const faviconColorsCookie = useCookie<FaviconColors | null>(COOKIE_NAMES.faviconColors, {
    ...UI_COOKIE_OPTIONS,
    default: () => null,
  })

  let faviconUrl: string | null = null

  const themeColor = ref<string | null>(null)

  useHead({
    meta: computed(() => themeColor.value ? [{ key: 'theme-color', name: 'theme-color', content: themeColor.value }] : []),
  })

  const updateThemeColor = () => {
    themeColor.value = getComputedStyle(document.documentElement).getPropertyValue('--color-base-200').trim() || null
  }

  const updateFavicon = () => {
    const colors: FaviconColors = {
      contours: getComputedStyle(document.documentElement).getPropertyValue('--logo-contours').trim(),
      face: getComputedStyle(document.documentElement).getPropertyValue('--logo-face').trim(),
      cheeks: getComputedStyle(document.documentElement).getPropertyValue('--logo-cheeks').trim(),
      roof: getComputedStyle(document.documentElement).getPropertyValue('--logo-roof').trim(),
      pipe: getComputedStyle(document.documentElement).getPropertyValue('--logo-pipe').trim(),
    }

    faviconColorsCookie.value = colors

    const svg = generateFaviconSvg(colors)
    const blob = new Blob([svg], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)

    const existingFavicon = document.querySelector('link[rel="icon"]')
    if (existingFavicon) {
      existingFavicon.setAttribute('href', url)
    }
    else {
      const link = document.createElement('link')
      link.rel = 'icon'
      link.type = 'image/svg+xml'
      link.href = url
      document.head.appendChild(link)
    }

    if (faviconUrl) {
      URL.revokeObjectURL(faviconUrl)
    }
    faviconUrl = url
  }

  onNuxtReady(() => {
    updateFavicon()
    updateThemeColor()

    const observer = new MutationObserver((mutations) => {
      const themeChanged = mutations.some(mutation =>
        mutation.type === 'attributes'
        && mutation.attributeName === 'data-theme'
        && (mutation.target === document.documentElement || mutation.target === document.body),
      )

      if (themeChanged) {
        setTimeout(() => {
          updateFavicon()
          updateThemeColor()
        }, 0)
      }
    })

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    })

    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['data-theme'],
    })
  })
})
