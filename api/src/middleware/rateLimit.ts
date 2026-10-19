import type { Context, MiddlewareHandler } from 'hono'
import { getConnInfo } from '@hono/node-server/conninfo'
import { logger } from '../lib/logger.js'

interface Bucket {
  count: number
  resetAt: number
}

const WINDOW_MS = 60_000 
const MAX_REQUESTS = 10

const buckets = new Map<string, Bucket>()

setInterval(() => {
  const now = Date.now()
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key)
  }
}, WINDOW_MS).unref()

function getClientIp(c: Context): string {
  const forwardedFor = c.req.header('x-forwarded-for')
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim()
  }

  const info = getConnInfo(c)
  return info.remote.address ?? 'unknown'
}

export const rateLimit: MiddlewareHandler = async (c, next) => {
  const ip = getClientIp(c)
  const now = Date.now()
  const bucket = buckets.get(ip)

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(ip, { count: 1, resetAt: now + WINDOW_MS })
    await next()
    return
  }

  if (bucket.count >= MAX_REQUESTS) {
    const retryAfterSeconds = Math.ceil((bucket.resetAt - now) / 1000)
    logger.warn({ ip, retryAfterSeconds }, 'rate_limit_exceeded')
    c.header('Retry-After', String(retryAfterSeconds))
    return c.json({ error: 'Too many requests. Please try again later.' }, 429)
  }

  bucket.count += 1
  await next()
}