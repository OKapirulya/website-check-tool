import type { Finding } from '../types.js'
import { safeFetch } from '../lib/http.js'

export async function checkCookies(url: string): Promise<Finding[]> {
  const response = await safeFetch(url, { redirect: 'follow' })
  const setCookieHeaders = response.headers.getSetCookie()

  if (setCookieHeaders.length === 0) {
    return [{
      id: 'cookies',
      title: 'Cookie Flags',
      severity: 'low',
      passed: true,
      details: 'No cookies were set by this response.',
    }]
  }

  const findings: Finding[] = []

  for (const cookie of setCookieHeaders) {
    const name = cookie.split('=')[0]
    const lower = cookie.toLowerCase()

    const missingFlags: string[] = []
    if (!lower.includes('secure')) missingFlags.push('Secure')
    if (!lower.includes('httponly')) missingFlags.push('HttpOnly')
    if (!lower.includes('samesite')) missingFlags.push('SameSite')

    findings.push({
      id: `cookie-${name}`,
      title: `Cookie: ${name}`,
      severity: missingFlags.length > 0 ? 'medium' : 'low',
      passed: missingFlags.length === 0,
      details: missingFlags.length === 0
        ? `Cookie "${name}" has Secure, HttpOnly, and SameSite set.`
        : `Cookie "${name}" is missing: ${missingFlags.join(', ')}.`,
    })
  }

  return findings
}
