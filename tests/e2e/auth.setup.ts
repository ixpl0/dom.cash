import { test as setup } from '@playwright/test'
import { authenticateViaUI } from './helpers/auth'

const authFile = '.auth/user.json'

setup('authenticate', async ({ page }) => {
  await authenticateViaUI(page)
  await page.context().storageState({ path: authFile })
})
