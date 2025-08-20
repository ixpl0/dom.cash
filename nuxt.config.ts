import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  modules: ['@nuxt/eslint', '@nuxt/test-utils/module'],
  devtools: { enabled: true },
  css: ['~/assets/app.css'],
  nitro: {
    preset: 'cloudflare-pages',
    compatibilityDate: '2025-07-15',
  },
  vite: { plugins: [tailwindcss()] },
  eslint: { config: { stylistic: true } },
})
