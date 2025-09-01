export default defineNuxtPlugin(() => {
  try {
    const t = localStorage.getItem('theme')
    if (t) {
      document.documentElement.setAttribute('data-theme', t)
    }
  }
  // eslint-disable-next-line no-empty
  catch {}
})
