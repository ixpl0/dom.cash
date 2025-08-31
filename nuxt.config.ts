import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  modules: ['@nuxt/eslint', '@nuxt/test-utils/module', '@pinia/nuxt'],
  devtools: { enabled: true },
  app: {
    head: {
      title: 'dom.cash - Budget Tracker',
      meta: [
        { name: 'description', content: 'Прозрачность домашних финансов. Трекинг личного бюджета с поддержкой множественных валют.' },
        { name: 'keywords', content: 'budget, finance, tracker, домашние финансы, бюджет, трекер' },
        { property: 'og:title', content: 'dom.cash - Budget Tracker' },
        { property: 'og:description', content: 'Прозрачность домашних финансов. Трекинг личного бюджета с поддержкой множественных валют.' },
        { property: 'og:type', content: 'website' },
        { property: 'og:url', content: 'https://dom.cash' },
      ],
      link: [
        { rel: 'canonical', href: 'https://dom.cash' },
      ],
    },
  },
  css: ['~/assets/app.css'],
  compatibilityDate: '2025-08-22',
  nitro: {
    preset: 'cloudflare-module',
    routeRules: {
      '/**': {
        headers: {
          'X-Content-Type-Options': 'nosniff',
          'X-XSS-Protection': '1; mode=block',
          'Referrer-Policy': 'strict-origin-when-cross-origin',
          'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
          ...(process.env.NODE_ENV === 'production' && {
            'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
            'Content-Security-Policy': 'default-src \'self\'; script-src \'self\' \'unsafe-inline\' https://accounts.google.com https://gsi.gstatic.com; style-src \'self\' \'unsafe-inline\' https://accounts.google.com; img-src \'self\' data: https://accounts.google.com https://ssl.gstatic.com https://lh3.googleusercontent.com; font-src \'self\'; connect-src \'self\' https://accounts.google.com https://oauth2.googleapis.com; frame-src https://accounts.google.com; frame-ancestors \'none\'',
          }),
        },
      },
    },
  },
  vite: { plugins: [tailwindcss()] },
  typescript: {
    typeCheck: true,
  },
  eslint: { config: { stylistic: true } },
})
