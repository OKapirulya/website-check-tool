import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { Hono } from 'hono'
import { secureHeaders } from 'hono/secure-headers'
import { checkAccessibility } from './checks/accessibility.js'
import { runAllChecks } from './checks/index.js'
import { explainFindings } from './lib/ai.js'
import { validateTargetUrl, UrlValidationError } from './lib/http.js'
import { logger } from './lib/logger.js'
import { accessibilityRateLimit, explainRateLimit, rateLimit } from './middleware/rateLimit.js'

try {
  process.loadEnvFile()
} catch {
  // No local .env file present
}

const app = new Hono()

app.use(
  '*',
  secureHeaders({
    contentSecurityPolicy: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'"],
    },
  })
)

app.get('/health', (c) => {
  return c.json({ status: 'ok' })
})

app.get('/check', rateLimit, async (c) => {
  const url = c.req.query('url')

  if (!url) {
    return c.json({ error: 'Missing url query parameter' }, 400)
  }

  try {
    await validateTargetUrl(url)
  } catch (error) {
    if (error instanceof UrlValidationError) {
      logger.warn({ url, reason: error.message }, 'scan_rejected')
      return c.json({ error: error.message }, 400)
    }
    return c.json({ error: 'Invalid URL' }, 400)
  }

  const startedAt = Date.now()

  try {
    const findings = await runAllChecks(url)
    logger.info(
      { url, durationMs: Date.now() - startedAt, findingsCount: findings.length },
      'scan_completed'
    )
    return c.json({ url, findings })
  } catch (error) {
    logger.error(
      {
        url,
        durationMs: Date.now() - startedAt,
        error: error instanceof Error ? error.message : 'unknown',
      },
      'scan_failed'
    )
    return c.json({ error: 'Could not reach target URL' }, 502)
  }
})

app.get('/explain', explainRateLimit, async (c) => {
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

  const startedAt = Date.now()

  try {
    const findings = await runAllChecks(url)
    const explanation = await explainFindings(url, findings)

    logger.info(
      { url, durationMs: Date.now() - startedAt, findingsCount: findings.length },
      'explanation_completed'
    )

    return c.json({ url, explanation })
  } catch (error) {
    logger.error(
      {
        url,
        durationMs: Date.now() - startedAt,
        error: error instanceof Error ? error.message : 'unknown',
      },
      'explanation_failed'
    )
    return c.json({ error: 'Could not generate explanation' }, 502)
  }
})

app.get('/accessibility', accessibilityRateLimit, async (c) => {
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

  const startedAt = Date.now()

  try {
    const findings = await checkAccessibility(url)
    logger.info(
      { url, durationMs: Date.now() - startedAt, findingsCount: findings.length },
      'accessibility_completed'
    )
    return c.json({ url, findings })
  } catch (error) {
    logger.error(
      {
        url,
        durationMs: Date.now() - startedAt,
        error: error instanceof Error ? error.message : 'unknown',
      },
      'accessibility_failed'
    )
    return c.json({ error: 'Could not run accessibility check' }, 502)
  }
})

app.get('/', serveStatic({ path: './public/index.html' }))
app.use('/*', serveStatic({ root: './public' }))

const port = 3000

const server = serve({
  fetch: app.fetch,
  port,
})

logger.info({ port }, 'server_started')

process.on('SIGTERM', () => {
  logger.info('shutdown_initiated')
  server.close(() => {
    process.exit(0)
  })
})