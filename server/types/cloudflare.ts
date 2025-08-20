declare global {
  interface D1Database {
    prepare: (query: string) => any
    dump: () => Promise<ArrayBuffer>
    batch: (statements: any[]) => Promise<any[]>
    exec: (query: string) => Promise<any>
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