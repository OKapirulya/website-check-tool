import type { Finding } from '../types.js'
import { safeFetch } from '../lib/http.js'

export async function checkSecurityHeaders(url: string): Promise<Finding[]> {
  const response = await safeFetch(url, { redirect: 'follow' })
  const headers = response.headers
  const findings: Finding[] = []

  findings.push({
    id: 'csp',
    title: 'Content-Security-Policy',
    severity: 'high',
    passed: headers.has('content-security-policy'),
    details: headers.has('content-security-policy')
      ? 'CSP header is present.'
      : 'No CSP header found. This increases the risk of cross-site scripting (XSS) attacks.',
  })

  findings.push({
    id: 'hsts',
    title: 'Strict-Transport-Security',
    severity: 'high',
    passed: headers.has('strict-transport-security'),
    details: headers.has('strict-transport-security')
      ? 'HSTS header is present.'
      : 'No HSTS header found. Visitors could be downgraded to an insecure HTTP connection.',
  })

  findings.push({
    id: 'x-frame-options',
    title: 'X-Frame-Options',
    severity: 'medium',
    passed: headers.has('x-frame-options'),
    details: headers.has('x-frame-options')
      ? 'X-Frame-Options header is present.'
      : 'No X-Frame-Options header found. The site could be embedded in a hidden iframe (clickjacking).',
  })

  findings.push({
    id: 'x-content-type-options',
    title: 'X-Content-Type-Options',
    severity: 'medium',
    passed: headers.get('x-content-type-options') === 'nosniff',
    details: headers.get('x-content-type-options') === 'nosniff'
      ? 'X-Content-Type-Options header is set to nosniff.'
      : 'Missing or incorrect X-Content-Type-Options header. Browsers may misinterpret file types.',
  })

  findings.push({
    id: 'referrer-policy',
    title: 'Referrer-Policy',
    severity: 'low',
    passed: headers.has('referrer-policy'),
    details: headers.has('referrer-policy')
      ? 'Referrer-Policy header is present.'
      : 'No Referrer-Policy header found. Full URLs may leak to third parties via the referrer.',
  })

  findings.push({
    id: 'permissions-policy',
    title: 'Permissions-Policy',
    severity: 'low',
    passed: headers.has('permissions-policy'),
    details: headers.has('permissions-policy')
      ? 'Permissions-Policy header is present.'
      : 'No Permissions-Policy header found. Browser features (camera, geolocation, etc.) are not explicitly restricted.',
  })

  return findings
}