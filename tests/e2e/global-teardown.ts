import { BASE_URL } from './constants'

const globalTeardown = async (): Promise<void> => {
  const response = await fetch(`${BASE_URL}/api/test/cleanup`, { method: 'DELETE' })

  if (!response.ok) {
    throw new Error(`Test data cleanup failed with status ${response.status}: ${await response.text()}`)
  }
}

export default globalTeardown
