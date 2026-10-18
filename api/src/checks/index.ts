import type { Finding } from '../types.js'
import { checkSecurityHeaders } from './securityHeaders.js'

type CheckFn = (url: string) => Promise<Finding[]>

const checks: CheckFn[] = [checkSecurityHeaders]

export async function runAllChecks(url: string): Promise<Finding[]> {
  const results = await Promise.all(checks.map((check) => check(url)))
  return results.flat()
}