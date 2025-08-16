import { createClient } from '@libsql/client'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'

const url = 'file:./db.sqlite'
const dir = './backups'
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
const backupPath = join(dir, `db-${timestamp}.sqlite`)

async function backupDatabase() {
  try {
    console.log('📦 Creating database backup...')

    await mkdir(dir, { recursive: true })

    const client = createClient({ url })

    const escapedPath = backupPath.replace(/'/g, '\'\'')
    await client.execute(`VACUUM INTO '${escapedPath}'`)
    await client.close()

    console.log(`✅ Database backed up to: ${backupPath}`)
  }
  catch (error) {
    console.error('❌ Backup failed:', error)
    process.exit(1)
  }
}

backupDatabase()
