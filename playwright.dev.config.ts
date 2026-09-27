import { defineConfig } from '@playwright/test'
import baseConfig from './playwright.config'
import { BASE_URL } from './tests/e2e/constants'

export default defineConfig({
  ...baseConfig,
  webServer: {
    command: 'pnpm preview:e2e',
    url: BASE_URL,
    reuseExistingServer: true,
    timeout: 120000,
  },
})
