import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  workers: 1,
  fullyParallel: false,
  testDir: 'tests/e2e',
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:8787',
    trace: 'on-first-retry',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'pnpm preview:e2e',
    url: 'http://localhost:8787',
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: '.auth/user.json',
      },
      dependencies: ['setup'],
      testIgnore: [/.*\.teardown\.spec\.ts/, '**/public/**'],
      fullyParallel: false,
    },
    {
      name: 'chromium-public',
      testMatch: '**/public/**',
      use: { ...devices['Desktop Chrome'] },
      fullyParallel: false,
    },
    {
      name: 'teardown',
      testMatch: /.*\.teardown\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        baseURL: process.env.BASE_URL || 'http://localhost:8787',
      },
      dependencies: ['chromium', 'chromium-public'],
    },
  ],
})
