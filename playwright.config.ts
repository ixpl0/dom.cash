import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  workers: 4,
  fullyParallel: false,
  testDir: 'tests/e2e',
  retries: 2,
  timeout: 60000,
  expect: {
    timeout: 10000,
  },
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:8787',
    trace: 'on-first-retry',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
    actionTimeout: 15000,
    navigationTimeout: 30000,
  },
  webServer: {
    command: 'pnpm preview:e2e',
    url: 'http://localhost:8787',
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    {
      name: 'chromium-public',
      testMatch: '**/public/**',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testIgnore: [/.*\.teardown\.spec\.ts/, '**/public/**'],
      testMatch: '**/authenticated/**',
      dependencies: ['chromium-public'],
    },
    {
      name: 'teardown',
      testMatch: /.*\.teardown\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        baseURL: process.env.BASE_URL || 'http://localhost:8787',
      },
      dependencies: ['chromium'],
    },
  ],
})
