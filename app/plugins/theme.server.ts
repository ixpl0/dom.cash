import type { FaviconColors } from '~/utils/favicon'
import { generateFaviconDataUrl } from '~/utils/favicon'

export default defineNuxtPlugin(() => {
  const cookie = useCookie<string>('theme').value
  const faviconColorsCookie = useCookie<string>('favicon-colors').value
  const state = useState<string>('theme.current', () => 'auto')

  if (cookie && cookie !== 'auto') {
    state.value = cookie

    const getFaviconLink = () => {
      if (!faviconColorsCookie) {
        return undefined
      }

      try {
        const colors = JSON.parse(decodeURIComponent(faviconColorsCookie)) as FaviconColors

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
