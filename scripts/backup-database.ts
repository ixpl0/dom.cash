import { spawnSync } from 'node:child_process'
import { readdirSync, rmSync, statSync } from 'node:fs'
import { join } from 'node:path'

const BACKUP_DIRECTORY = 'backups'
const BACKUP_LIFETIME_MS = 60 * 24 * 60 * 60 * 1000

const timestamp = `${new Date().toISOString().slice(0, 19).replaceAll(':', '-')}Z`
const outputPath = `${BACKUP_DIRECTORY}/backup-prod-${timestamp}.sql`
const command = ['pnpm', 'exec', 'wrangler', 'd1', 'export', 'DB', `--output=${outputPath}`, '--remote', '--env=production'].join(' ')

const deleteOldBackups = (): string[] => {
  const oldestKeptTime = Date.now() - BACKUP_LIFETIME_MS
  const oldBackups = readdirSync(BACKUP_DIRECTORY)
    .filter(fileName => fileName.startsWith('backup-') && fileName.endsWith('.sql'))
    .map(fileName => join(BACKUP_DIRECTORY, fileName))
    .filter(filePath => statSync(filePath).mtimeMs < oldestKeptTime)

  oldBackups.forEach(filePath => rmSync(filePath))

  return oldBackups
}

const result = spawnSync(command, { stdio: 'inherit', shell: true })

if (result.status === 0) {
  console.log(`Backup saved to ${outputPath}`)

  const deletedBackups = deleteOldBackups()

  if (deletedBackups.length > 0) {
    console.log(`Deleted backups older than two months: ${deletedBackups.join(', ')}`)
  }
}

process.exit(result.status ?? 1)
