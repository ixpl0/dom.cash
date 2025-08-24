import type { H3Event } from 'h3'
import { createError, getHeader } from 'h3'

const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000 // 15 minutes
const AUTH_RATE_LIMIT_WINDOW_MS = 60 * 1000 // 1 minute

interface RateLimitConfig {
  maxRequests: number
  windowMs: number
}

interface RateLimitEntry {
  count: number
  resetTime: number
}

const ipCounts = new Map<string, RateLimitEntry>()
let requestCounter = 0

const cleanupExpiredEntries = () => {
  const now = Date.now()
  for (const [ip, entry] of ipCounts.entries()) {
    if (now > entry.resetTime) {
      ipCounts.delete(ip)
    }
  }
}

const getClientIP = (event: H3Event): string => {
  const forwarded = getHeader(event, 'x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0]?.trim() || 'unknown'
  }

  const realIP = getHeader(event, 'x-real-ip')
  if (realIP) {
    return realIP
  }

  const cfConnectingIP = getHeader(event, 'cf-connecting-ip')
  if (cfConnectingIP) {
    return cfConnectingIP
  }

  return 'unknown'
}

export const rateLimit = (config: RateLimitConfig) => {
  return (event: H3Event) => {
    const ip = getClientIP(event)
    const now = Date.now()

    requestCounter++
    if (requestCounter % 1000 === 0) {
      cleanupExpiredEntries()
    }

    const entry = ipCounts.get(ip)

    if (!entry || now > entry.resetTime) {
      ipCounts.set(ip, {
        count: 1,
        resetTime: now + config.windowMs,
      })
      return
    }

    if (entry.count >= config.maxRequests) {
      throw createError({
        statusCode: 429,
        statusMessage: 'Too Many Requests',
        message: 'Rate limit exceeded. Please try again later.',
      })
    }

    entry.count++
    ipCounts.set(ip, entry)
  }
}

export const authRateLimit = rateLimit({
  maxRequests: 5,
  windowMs: AUTH_RATE_LIMIT_WINDOW_MS,
})

export const generalRateLimit = rateLimit({
  maxRequests: 1000,
  windowMs: RATE_LIMIT_WINDOW_MS,
})
