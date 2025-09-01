export default defineNuxtPlugin(() => {
  const cookie = useCookie<string>('theme').value
  const state = useState<string>('theme.current', () => 'auto')

  if (cookie && cookie !== 'auto') {
    state.value = cookie
    useHead({
      htmlAttrs: {
        'data-theme': cookie,
      },
    })
  }
  else {
    state.value = 'auto'
  }
})
