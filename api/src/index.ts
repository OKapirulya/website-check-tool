import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { checkSecurityHeaders } from './checks/securityHeaders.js'

const app = new Hono()

app.get('/health', (c) => {
  return c.json({ status: 'ok' })
})

const port = 3000
console.log(`Server running at http://localhost:${port}`)

serve({
  fetch: app.fetch,
  port,
})

app.get('/check', async (c) => {
  const url = c.req.query('url')

  if (!url) {
    return c.json({ error: 'Missing url query parameter' }, 400)
  }

  try {
    const findings = await checkSecurityHeaders(url)
    return c.json({ url, findings })
  } catch (error) {
    return c.json({ error: 'Could not reach target URL' }, 502)
  }
})