import { test, expect } from '@playwright/test'

test.describe.configure({ mode: 'serial' })

test('cleanup test data from database', async ({ request }) => {
  const response = await request.delete('http://localhost:8787/api/test/cleanup')

  if (!response.ok()) {
    const errorText = await response.text()
    throw new Error(`Request failed with status ${response.status()}: ${errorText}`)
  }

  const data = await response.json()

  expect(data).toHaveProperty('message')
  expect(data.message).toContain('cleaned up successfully')
})
