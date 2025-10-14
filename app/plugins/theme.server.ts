import type { FaviconColors } from '~/utils/favicon'
import { generateFaviconDataUrl } from '~/utils/favicon'

export default defineNuxtPlugin(() => {
  const cookie = useCookie<string>('theme').value
  const faviconColorsCookie = useCookie<string>('favicon-colors').value
  const state = useState<string>('theme.current', () => 'auto')

  if (cookie && cookie !== 'auto') {
    state.value = cookie

    const getFaviconLink = () => {
      try {
        const colors = faviconColorsCookie
          ? JSON.parse(decodeURIComponent(faviconColorsCookie)) as FaviconColors
          : {
              contours: '#2c2d30',
              face: '#fff',
              cheeks: '#FF6661',
              roof: '#FF6661',
              pipe: '#A9DC76',
            }

        return [
          {
            rel: 'icon',
            type: 'image/svg+xml',
            href: generateFaviconDataUrl(colors),
          },
        ]
      }

      catch {
        return undefined
      }
    }

    useHead({
      htmlAttrs: {
        'data-theme': cookie,
      },
      link: getFaviconLink(),
    })
  }
  else {
    state.value = 'auto'
  }
})
