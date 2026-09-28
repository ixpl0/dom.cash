import { defineConfig, devices } from '@playwright/test'
import { BASE_URL } from './tests/e2e/constants'

export default defineConfig({
  workers: 4,
  fullyParallel: false,
  testDir: 'tests/e2e',
  globalSetup: './tests/e2e/global-setup.ts',
  globalTeardown: './tests/e2e/global-teardown.ts',
  retries: process.env.CI ? 2 : 0,
  timeout: 60000,
  expect: {
    timeout: 10000,
  },
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
    actionTimeout: 15000,
    navigationTimeout: 30000,
  },
  webServer: {
    command: 'pnpm exec tsx tests/e2e/server.ts',
    url: BASE_URL,
    reuseExistingServer: false,
    timeout: 120000,
  },
  projects: [
    {
      name: 'chromium-public',
      testMatch: '**/public/**',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'chromium',
      testMatch: '**/authenticated/**',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile',
      testMatch: '**/mobile/**',
      use: { ...devices['Pixel 7'] },
    },
    {
      name: 'admin',
      testMatch: '**/admin/**',
      dependencies: ['chromium-public', 'chromium', 'mobile'],
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
