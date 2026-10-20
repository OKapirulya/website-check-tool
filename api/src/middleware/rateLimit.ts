import type { Context, MiddlewareHandler } from 'hono'
import { getConnInfo } from '@hono/node-server/conninfo'
import { logger } from '../lib/logger.js'

interface Bucket {
  count: number
  resetAt: number
}

interface RateLimitOptions {
  windowMs: number
  maxRequests: number
}

function getClientIp(c: Context): string {
  const forwardedFor = c.req.header('x-forwarded-for')
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim()
  }

  const info = getConnInfo(c)
  return info.remote.address ?? 'unknown'
}

export function createRateLimiter({ windowMs, maxRequests }: RateLimitOptions): MiddlewareHandler {
  const buckets = new Map<string, Bucket>()

  setInterval(() => {
    const now = Date.now()
    for (const [key, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(key)
    }
  }, windowMs).unref()

  return async (c, next) => {
    const ip = getClientIp(c)
    const now = Date.now()
    const bucket = buckets.get(ip)

    if (!bucket || bucket.resetAt <= now) {
      buckets.set(ip, { count: 1, resetAt: now + windowMs })
      await next()
      return
    }

    if (bucket.count >= maxRequests) {
      const retryAfterSeconds = Math.ceil((bucket.resetAt - now) / 1000)
      logger.warn({ ip, retryAfterSeconds }, 'rate_limit_exceeded')
      c.header('Retry-After', String(retryAfterSeconds))
      return c.json({ error: 'Too many requests. Please try again later.' }, 429)
    }

    bucket.count += 1
    await next()
  }
}

const checkMax = Number(process.env.RATE_LIMIT_CHECK_MAX ?? 10)
const explainMax = Number(process.env.RATE_LIMIT_EXPLAIN_MAX ?? 5)

export const rateLimit = createRateLimiter({ windowMs: 60_000, maxRequests: checkMax })
export const explainRateLimit = createRateLimiter({ windowMs: 60_000, maxRequests: explainMax })
export const accessibilityRateLimit = createRateLimiter({ windowMs: 60_000, maxRequests: 5 })