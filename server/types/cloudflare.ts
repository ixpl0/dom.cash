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

export interface DocsBucketHttpMetadata {
  contentType?: string
}

export interface DocsBucketObject {
  key: string
  size: number
  httpEtag: string
  httpMetadata?: DocsBucketHttpMetadata
}

export interface DocsBucketObjectBody extends DocsBucketObject {
  body: ReadableStream<Uint8Array>
  blob: () => Promise<Blob>
}

export interface DocsBucketListResult {
  objects: Array<Pick<DocsBucketObject, 'key'>>
  truncated: boolean
  cursor?: string
}

export interface DocsBucketListOptions {
  prefix?: string
  cursor?: string
  limit?: number
}

export interface DocsBucket {
  get: (key: string) => Promise<DocsBucketObjectBody | null>
  put: (key: string, value: ArrayBuffer | ArrayBufferView | Blob, options?: { httpMetadata?: DocsBucketHttpMetadata }) => Promise<DocsBucketObject | null>
  delete: (keys: string | string[]) => Promise<void>
  list: (options?: DocsBucketListOptions) => Promise<DocsBucketListResult>
}

export interface CloudflareEnv {
  DB: D1Database
  DOCS_BUCKET?: DocsBucket
}

export interface CloudflareContext {
  env: CloudflareEnv
}

declare module 'h3' {
  interface H3EventContext {
    cloudflare?: CloudflareContext
  }
}
