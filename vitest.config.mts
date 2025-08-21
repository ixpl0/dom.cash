import { defineConfig } from 'vitest/config'
import { defineVitestProject } from '@nuxt/test-utils/config'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const root = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  test: {
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '*.config.*',
        '.nuxt/',
        '.output/',
        'scripts/',
        'app/**/*',
      ],
      include: [
        'server/db/**/*',
        'server/utils/**/*',
        'server/schemas/**/*',
        'server/plugins/**/*',
        'server/api/auth/**/*',
        'server/api/currency/**/*',
        'server/services/**/*',
        'shared/**/*',
      ],
    },
    projects: [
      {
        test: {
          name: 'unit',
          include: ['test/unit/**/*.{test,spec}.ts', 'tests/unit/**/*.{test,spec}.ts'],
          environment: 'node',
          setupFiles: ['tests/setup.ts'],
        },
        resolve: {
          alias: {
            '~~': root,
            '@@': root,
            '~': resolve(root, 'app'),
            '@': resolve(root, 'app'),
            '#fixtures': resolve(root, 'tests/fixtures'),
          },
        },
      },
      {
        test: {
          name: 'nuxt',
          include: ['test/nuxt/**/*.{test,spec}.ts', 'tests/nuxt/**/*.{test,spec}.ts'],
          environment: 'happy-dom',
          pool: 'forks',
          poolOptions: {
            forks: {
              singleFork: true,
              isolate: true,
            },
          },
        },
        resolve: {
          alias: {
            '~~': root,
            '@@': root,
            '~': resolve(root, 'app'),
            '@': resolve(root, 'app'),
            '#fixtures': resolve(root, 'tests/fixtures'),
          },
        },
      },
    ],
  },
})
