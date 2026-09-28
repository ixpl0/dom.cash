import { spawnSync } from 'node:child_process'

const TARGET_ARGUMENTS = {
  local: ['--local'],
  test: ['--remote', '--env='],
  prod: ['--remote', '--env=production'],
} as const

type BackupTarget = keyof typeof TARGET_ARGUMENTS

const isBackupTarget = (value: string | undefined): value is BackupTarget =>
  value !== undefined && value in TARGET_ARGUMENTS

const target = process.argv[2]

if (!isBackupTarget(target)) {
  console.error('Usage: tsx scripts/backup-database.ts <local|test|prod>')
  process.exit(1)
}

const timestamp = `${new Date().toISOString().slice(0, 19).replaceAll(':', '-')}Z`
const outputPath = `backups/backup-${target}-${timestamp}.sql`
const command = ['pnpm', 'exec', 'wrangler', 'd1', 'export', 'DB', `--output=${outputPath}`, ...TARGET_ARGUMENTS[target]].join(' ')

const result = spawnSync(command, { stdio: 'inherit', shell: true })

if (result.status === 0) {
  console.log(`Backup saved to ${outputPath}`)
}

process.exit(result.status ?? 1)
