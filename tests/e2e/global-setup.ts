import { rm } from 'fs/promises'
import { AUTH_DIR } from './constants'

const globalSetup = async (): Promise<void> => {
  await rm(AUTH_DIR, { recursive: true, force: true })
}

export default globalSetup
