import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { runAllChecks } from './checks/index.js'
import { validateTargetUrl, UrlValidationError } from './lib/http.js'
import { rateLimit } from './middleware/rateLimit.js'

const app = new Hono()

app.get('/health', (c) => {
  return c.json({ status: 'ok' })
})

app.get('/check', rateLimit,  async (c) => {
  const url = c.req.query('url')

  if (!url) {
    return c.json({ error: 'Missing url query parameter' }, 400)
  }

  try {
    await validateTargetUrl(url)
  } catch (error) {
    if (error instanceof UrlValidationError) {
      return c.json({ error: error.message }, 400)
    }
    return c.json({ error: 'Invalid URL' }, 400)
  }

  try {
    const findings = await runAllChecks(url)
    return c.json({ url, findings })
  } catch (error) {
    return c.json({ error: 'Could not reach target URL' }, 502)
  }
})

const port = 3000
console.log(`Server running at http://localhost:${port}`)

const server = serve({
  fetch: app.fetch,
  port,
})

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully')
  server.close(() => {
    process.exit(0)
  })
})