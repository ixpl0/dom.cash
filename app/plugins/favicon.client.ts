import type { FaviconColors } from '~/utils/favicon'
import { generateFaviconSvg } from '~/utils/favicon'

const COOKIE_NAME = 'favicon-colors'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365

export default defineNuxtPlugin(() => {
  const faviconColorsCookie = useCookie<FaviconColors | null>(COOKIE_NAME, {
    maxAge: COOKIE_MAX_AGE,
    default: () => null,
  })

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
  }

  onNuxtReady(() => {
    updateFavicon()

    const observer = new MutationObserver((mutations) => {
      const themeChanged = mutations.some(mutation =>
        mutation.type === 'attributes'
        && mutation.attributeName === 'data-theme'
        && (mutation.target === document.documentElement || mutation.target === document.body),
      )

      if (themeChanged) {
        setTimeout(updateFavicon, 0)
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
