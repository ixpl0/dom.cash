import { spawn, spawnSync } from 'node:child_process'
import { rmSync } from 'node:fs'
import { E2E_DATABASE_DIR, E2E_OUTPUT_DIR, E2E_PORT } from './constants'

const wranglerEnv = {
  ...process.env,
  CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV: 'false',
  WRANGLER_SEND_METRICS: 'false',
}

const toWranglerCommand = (args: string[]): string => ['pnpm', 'exec', 'wrangler', ...args].join(' ')

rmSync(E2E_DATABASE_DIR, { recursive: true, force: true })

const migration = spawnSync(
  toWranglerCommand(['d1', 'migrations', 'apply', 'DB', '--local', '--persist-to', E2E_DATABASE_DIR]),
  { stdio: 'inherit', shell: true, env: wranglerEnv },
)

if (migration.status !== 0) {
  process.exit(migration.status ?? 1)
}

const server = spawn(
  toWranglerCommand([
    'dev',
    `${E2E_OUTPUT_DIR}/server/index.mjs`,
    '--assets',
    `${E2E_OUTPUT_DIR}/public`,
    '--port',
    E2E_PORT,
    '--persist-to',
    E2E_DATABASE_DIR,
    '--show-interactive-dev-session=false',
  ]),
  { stdio: 'inherit', shell: true, env: wranglerEnv },
)

server.on('exit', (code) => {
  process.exit(code ?? 0)
})
