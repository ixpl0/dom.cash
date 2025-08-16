import type { Config } from 'drizzle-kit'

export default {
  schema: './server/db/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  dbCredentials: { url: 'file:./db.sqlite' },
} satisfies Config
