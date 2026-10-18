import type { MiddlewareHandler } from 'hono'
import { getConnInfo } from '@hono/node-server/conninfo'

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

export const rateLimit: MiddlewareHandler = async (c, next) => {
  const info = getConnInfo(c)
  const ip = info.remote.address ?? 'unknown'

  const now = Date.now()
  const bucket = buckets.get(ip)

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(ip, { count: 1, resetAt: now + WINDOW_MS })
    await next()
    return
  }

  if (bucket.count >= MAX_REQUESTS) {
    const retryAfterSeconds = Math.ceil((bucket.resetAt - now) / 1000)
    c.header('Retry-After', String(retryAfterSeconds))
    return c.json({ error: 'Too many requests. Please try again later.' }, 429)
  }

  bucket.count += 1
  await next()
}
