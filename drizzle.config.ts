import type { Config } from 'drizzle-kit'

export default {
  schema: './server/db/schema.ts',
  dialect: 'sqlite',
  dbCredentials: { url: 'file:./db.sqlite' },
} satisfies Config
