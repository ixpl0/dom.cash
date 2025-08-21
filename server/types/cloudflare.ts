declare global {
  interface D1Database {
    prepare: (query: string) => unknown
    dump: () => Promise<ArrayBuffer>
    batch: (statements: unknown[]) => Promise<unknown[]>
    exec: (query: string) => Promise<unknown>
  }
}

export interface CloudflareEnv {
  DB: D1Database
}

export interface CloudflareContext {
  env: CloudflareEnv
}

declare module 'h3' {
  interface H3EventContext {
    cloudflare?: CloudflareContext
  }
}
