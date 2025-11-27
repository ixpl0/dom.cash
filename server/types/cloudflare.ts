/// <reference types="@cloudflare/workers-types" />

export interface CloudflareEnv {
  DB: D1Database
  BUDGET_NOTIFICATIONS: DurableObjectNamespace
  RESEND_API_KEY?: string
}

export interface CloudflareContext {
  env: CloudflareEnv
}

declare module 'h3' {
  interface H3EventContext {
    cloudflare?: CloudflareContext
  }
}
