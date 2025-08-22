import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  modules: ['@nuxt/eslint', '@nuxt/test-utils/module'],
  devtools: { enabled: true },
  css: ['~/assets/app.css'],
  compatibilityDate: '2025-08-22',
  nitro: {
    preset: 'cloudflare-module',
  },
  vite: { plugins: [tailwindcss()] },
  eslint: { config: { stylistic: true } },
})
