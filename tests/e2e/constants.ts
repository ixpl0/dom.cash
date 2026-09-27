import { join } from 'path'

export const INPUT_LIMITS = {
  USERNAME_MIN: 3,
  USERNAME_MAX: 64,
  PASSWORD_MIN: 8,
  PASSWORD_MAX: 100,
}

export const DEV_VERIFICATION_CODE = '111111'

export const E2E_PORT = '8787'

export const BASE_URL = process.env.BASE_URL || `http://localhost:${E2E_PORT}`

export const E2E_OUTPUT_DIR = '.output-e2e'

export const E2E_DATABASE_DIR = '.wrangler/e2e'

export const AUTH_DIR = join(process.cwd(), '.auth')
