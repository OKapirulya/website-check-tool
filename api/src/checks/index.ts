import type { Finding } from '../types.js'
import { checkSecurityHeaders } from './securityHeaders.js'
import { checkCookies } from './cookies.js'
import { checkServerFingerprint } from './serverFingerprint.js'
import { checkCors } from './cors.js'
import { checkExposedPaths } from './exposedPaths.js'
import { checkSitemapRobots } from './sitemap.js'
import { checkTls } from './tls.js'
import { checkMixedContent } from './mixedContent.js'
import { checkSri } from './sri.js'
import { checkDns } from './dns.js'
import { checkDirectoryListing } from './directoryListing.js'
import { logger } from '../lib/logger.js'

type CheckFn = (url: string) => Promise<Finding[]>

interface NamedCheck {
  name: string
  fn: CheckFn
}

const checks: NamedCheck[] = [
  { name: 'securityHeaders', fn: checkSecurityHeaders },
  { name: 'cookies', fn: checkCookies },
  { name: 'serverFingerprint', fn: checkServerFingerprint },
  { name: 'cors', fn: checkCors },
  { name: 'exposedPaths', fn: checkExposedPaths },
  { name: 'sitemapRobots', fn: checkSitemapRobots },
  { name: 'tls', fn: checkTls },
  { name: 'mixedContent', fn: checkMixedContent },
  { name: 'sri', fn: checkSri },
  { name: 'dns', fn: checkDns },
  { name: 'directoryListing', fn: checkDirectoryListing },
]

export async function runAllChecks(url: string): Promise<Finding[]> {
  const results = await Promise.allSettled(checks.map(({ fn }) => fn(url)))

  const findings: Finding[] = []

  results.forEach((result, index) => {
    const { name } = checks[index]

    if (result.status === 'fulfilled') {
      findings.push(...result.value)
      return
    }

    logger.warn(
      { url, check: name, error: result.reason instanceof Error ? result.reason.message : 'unknown' },
      'check_failed'
    )

    findings.push({
      id: `${name}-error`,
      title: `${name} check`,
      severity: 'low',
      passed: false,
      details: 'This check could not be completed, possibly because the target blocked or timed out the request.',
    })
  })

  return findings
}