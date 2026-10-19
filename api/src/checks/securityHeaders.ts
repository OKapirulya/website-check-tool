import type { Finding } from '../types.js'
import { safeFetch } from '../lib/http.js'

const MIN_HSTS_MAX_AGE = 15_552_000 // ~180 days, a commonly recommended minimum

export async function checkSecurityHeaders(url: string): Promise<Finding[]> {
  const response = await safeFetch(url, { redirect: 'follow' })
  const headers = response.headers
  const findings: Finding[] = []

  const cspValue = headers.get('content-security-policy')

  findings.push({
    id: 'csp',
    title: 'Content-Security-Policy',
    severity: 'high',
    passed: Boolean(cspValue),
    details: cspValue
      ? 'CSP header is present.'
      : 'No CSP header found. This increases the risk of cross-site scripting (XSS) attacks.',
  })

  findings.push({
    id: 'csp-frame-ancestors',
    title: 'CSP frame-ancestors',
    severity: 'medium',
    passed: Boolean(cspValue && /frame-ancestors/i.test(cspValue)),
    details: cspValue && /frame-ancestors/i.test(cspValue)
      ? 'Content-Security-Policy restricts framing via frame-ancestors.'
      : 'No frame-ancestors directive found. X-Frame-Options alone is the older, less flexible protection against clickjacking.',
  })

  const hstsHeader = headers.get('strict-transport-security')
  const hstsMaxAgeMatch = hstsHeader?.match(/max-age=(\d+)/i)
  const hstsMaxAge = hstsMaxAgeMatch ? parseInt(hstsMaxAgeMatch[1], 10) : null
  const hstsPassed = hstsMaxAge !== null && hstsMaxAge >= MIN_HSTS_MAX_AGE

  findings.push({
    id: 'hsts',
    title: 'Strict-Transport-Security',
    severity: 'high',
    passed: hstsPassed,
    details: !hstsHeader
      ? 'No HSTS header found. Visitors could be downgraded to an insecure HTTP connection.'
      : hstsMaxAge === null
        ? 'HSTS header is present but has no readable max-age value.'
        : hstsPassed
          ? `HSTS header is present with a max-age of about ${Math.round(hstsMaxAge / 86400)} days.`
          : `HSTS header is present but its max-age of about ${Math.round(hstsMaxAge / 86400)} days is below the commonly recommended minimum of about 180 days.`,
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