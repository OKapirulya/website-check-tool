import type { Finding } from '../types.js'
import { checkSecurityHeaders } from './securityHeaders.js'
import { checkServerFingerprint } from './serverFingerprint.js'
import { checkCookies } from './cookies.js'
import { checkCors } from './cors.js'

type CheckFn = (url: string) => Promise<Finding[]>

const checks: CheckFn[] = [
  checkSecurityHeaders,
  checkCookies,
  checkServerFingerprint,
  checkCors,
]

export async function runAllChecks(url: string): Promise<Finding[]> {
  const results = await Promise.all(checks.map((check) => check(url)))
  return results.flat()
}