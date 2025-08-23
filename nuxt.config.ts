import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  modules: ['@nuxt/eslint', '@nuxt/test-utils/module'],
  devtools: { enabled: true },
  css: ['~/assets/app.css'],
  compatibilityDate: '2025-08-22',
  nitro: {
    preset: 'cloudflare-module',
    routeRules: {
      '/**': {
        headers: {
          'X-Frame-Options': 'DENY',
          'X-Content-Type-Options': 'nosniff',
          'X-XSS-Protection': '1; mode=block',
          'Referrer-Policy': 'strict-origin-when-cross-origin',
          'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
          ...(process.env.NODE_ENV === 'production' && {
            'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
            'Content-Security-Policy': 'default-src \'self\'; script-src \'self\' \'unsafe-inline\' https://accounts.google.com; style-src \'self\' \'unsafe-inline\'; img-src \'self\' data:; font-src \'self\'; connect-src \'self\' https://accounts.google.com; frame-ancestors \'none\'',
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
