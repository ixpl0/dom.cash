import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  modules: ['@nuxt/eslint', '@pinia/nuxt', '@nuxt/icon', '@nuxtjs/i18n'],
  devtools: { enabled: true },
  app: {
    head: {
      meta: [
        { property: 'og:type', content: 'website' },
        { property: 'og:url', content: 'https://dom.cash' },
      ],
      link: [
        { rel: 'canonical', href: 'https://dom.cash' },
      ],
    },
  },
  css: ['~/assets/app.css'],
  runtimeConfig: {
    public: {
      environment: process.env.NUXT_PUBLIC_ENVIRONMENT || 'production',
    },
  },
  compatibilityDate: '2025-10-10',
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
            'Content-Security-Policy': 'default-src \'self\'; script-src \'self\' \'unsafe-inline\' https://accounts.google.com https://gsi.gstatic.com https://static.cloudflareinsights.com; style-src \'self\' \'unsafe-inline\' https://accounts.google.com; img-src \'self\' data: blob: https://accounts.google.com https://ssl.gstatic.com https://lh3.googleusercontent.com; font-src \'self\'; connect-src \'self\' https://accounts.google.com https://oauth2.googleapis.com; frame-src https://accounts.google.com; frame-ancestors \'none\'',
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
  i18n: {
    defaultLocale: 'en',
    langDir: 'locales',
    locales: [
      { code: 'ru', language: 'ru-RU', name: 'Русский', file: 'ru.ts' },
      { code: 'en', language: 'en-US', name: 'English', file: 'en.ts' },
    ],
    strategy: 'no_prefix',
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'i18n_locale',
      redirectOn: 'all',
    },
  },
  icon: {
    clientBundle: {
      scan: true,
    },
  },
})
