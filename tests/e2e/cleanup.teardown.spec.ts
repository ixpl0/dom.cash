import { test, expect } from '@playwright/test'

test.describe.configure({ mode: 'serial' })

test('cleanup test data from database', async ({ request }) => {
  const response = await request.delete('/api/test/cleanup')

  expect(response.ok()).toBeTruthy()

  const data = await response.json()
  console.log('Cleanup result:', data)

  expect(data).toHaveProperty('message')
  expect(data.message).toContain('cleaned up successfully')
})
