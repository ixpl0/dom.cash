import { test as setup } from '@playwright/test'
import { authenticateViaAPI } from './helpers/auth'

const authFile = '.auth/user.json'

setup('authenticate', async ({ request }) => {
  await authenticateViaAPI(request)
  await request.storageState({ path: authFile })
})
