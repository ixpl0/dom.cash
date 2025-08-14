import type { H3Event } from 'h3'

declare global {
  const defineEventHandler: <T = any>(handler: (event: H3Event) => T) => (event: H3Event) => T
  const readBody: <T = any>(event: H3Event) => Promise<T>
  const defineNitroPlugin: (plugin: (nitroApp: any) => void) => void
}

export {}
