import { LOCALE_COOKIE_NAME } from './shared/utils/shared/locale'
import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  modules: ['@nuxt/eslint', '@pinia/nuxt', '@nuxt/icon', '@nuxtjs/i18n'],
  $env: {
    e2e: {
      buildDir: '.nuxt-e2e',
      nitro: {
        output: { dir: '.output-e2e' },
        replace: { 'process.env.E2E_TEST_MODE': JSON.stringify('true') },
      },
    },
  },
  imports: {
    dirs: [
      'composables/**',
      'stores/**',
    ],
  },
  devtools: { enabled: true },
  app: {
    head: {
      meta: [
        { property: 'og:type', content: 'website' },
        { property: 'og:url', content: 'https://domcash.ixplo.ai' },
      ],
      link: [
        { rel: 'canonical', href: 'https://domcash.ixplo.ai' },
        { rel: 'manifest', href: '/manifest.webmanifest' },
        { rel: 'apple-touch-icon', href: '/icons/apple-touch-icon.png' },
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
    replace: { 'process.env.E2E_TEST_MODE': JSON.stringify('false') },
    routeRules: {
      '/**': {
        headers: {
          'X-Content-Type-Options': 'nosniff',
          'X-XSS-Protection': '1; mode=block',
          'Referrer-Policy': 'strict-origin-when-cross-origin',
          'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
          ...(process.env.NODE_ENV === 'production' && {
            'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
            'Content-Security-Policy': 'default-src \'self\'; script-src \'self\' \'unsafe-inline\' https://static.cloudflareinsights.com; style-src \'self\' \'unsafe-inline\'; img-src \'self\' data: blob:; font-src \'self\'; connect-src \'self\' https://cloudflareinsights.com; frame-ancestors \'none\'; base-uri \'self\'; form-action \'self\'',
          }),
        },
      },
    },
  },
  vite: { plugins: [tailwindcss()] },
  typescript: {
    typeCheck: false,
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
      cookieKey: LOCALE_COOKIE_NAME,
      redirectOn: 'all',
    },
  },
  icon: {
    serverBundle: {
      collections: ['heroicons'],
    },
    fallbackToApi: false,
    clientBundle: {
      scan: true,
    },
  },
})
