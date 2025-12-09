declare global {
  interface D1PreparedStatement {
    bind: (...values: unknown[]) => D1PreparedStatement
    first: <T = unknown>(colName?: string) => Promise<T | null>
    run: () => Promise<D1Result>
    all: <T = unknown>() => Promise<D1Result<T>>
    raw: <T = unknown>() => Promise<T[]>
  }

  interface D1Result<T = unknown> {
    results?: T[]
    success: boolean
    error?: string
    meta: {
      duration: number
      size_after?: number
      rows_read?: number
      rows_written?: number
    }
  }

  interface D1Database {
    prepare: (query: string) => D1PreparedStatement
    dump: () => Promise<ArrayBuffer>
    batch: (statements: D1PreparedStatement[]) => Promise<D1Result[]>
    exec: (query: string) => Promise<D1Result>
  }
}

export interface CloudflareEnv {
  DB: D1Database
  RESEND_API_KEY?: string
  NUXT_PUBLIC_ENVIRONMENT?: string
}

export interface CloudflareContext {
  env: CloudflareEnv
}

declare module 'h3' {
  interface H3EventContext {
    cloudflare?: CloudflareContext
  }
}
