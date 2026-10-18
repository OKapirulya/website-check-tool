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

type CheckFn = (url: string) => Promise<Finding[]>

const checks: CheckFn[] = [
  checkSecurityHeaders,
  checkCookies,
  checkServerFingerprint,
  checkCors,
  checkExposedPaths,
  checkSitemapRobots,
  checkTls,
  checkMixedContent,
  checkSri,
  checkDns,
]

export async function runAllChecks(url: string): Promise<Finding[]> {
  const results = await Promise.all(checks.map((check) => check(url)))
  return results.flat()
}